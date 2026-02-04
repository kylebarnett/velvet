import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const reviewSchema = z.object({
  mappingId: z.string().uuid(),
  action: z.enum(["accept", "reject", "update"]),
  // Optional overrides when accepting or updating
  metricName: z.string().min(1).optional(),
  periodType: z.enum(["monthly", "quarterly", "annual"]).optional(),
  periodStart: z.string().min(1).optional(),
  periodEnd: z.string().min(1).optional(),
  value: z.string().min(1).optional(),
  notes: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: documentId } = await params;
  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const { mappingId, action, metricName, periodType, periodStart, periodEnd, value, notes } =
    parsed.data;

  // Verify founder owns the document's company
  const { data: doc } = await supabase
    .from("documents")
    .select("company_id")
    .eq("id", documentId)
    .single();

  if (!doc) return jsonError("Document not found.", 404);

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", doc.company_id)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized.", 403);

  // Verify the mapping belongs to this document
  const { data: mapping } = await supabase
    .from("document_metric_mappings")
    .select("id, extracted_metric_name, extracted_value, extracted_period_start, extracted_period_end, extracted_period_type, confidence_score, status, metric_value_id")
    .eq("id", mappingId)
    .eq("document_id", documentId)
    .single();

  if (!mapping) return jsonError("Mapping not found.", 404);

  // For accept/reject, must be pending. For update, must be accepted.
  if (action === "update") {
    if (mapping.status !== "accepted") {
      return jsonError("Can only update accepted metrics.", 400);
    }
  } else if (mapping.status !== "pending") {
    return jsonError("This metric has already been reviewed.", 400);
  }

  const admin = createSupabaseAdminClient();

  if (action === "reject") {
    await admin
      .from("document_metric_mappings")
      .update({ status: "rejected" })
      .eq("id", mappingId);

    return NextResponse.json({ ok: true, action: "rejected" });
  }

  // Accept or Update: upsert into company_metric_values
  const extractedValue =
    mapping.extracted_value as { raw?: string; unit?: string } | null;

  const finalMetricName = metricName ?? mapping.extracted_metric_name;
  const finalPeriodType = periodType ?? mapping.extracted_period_type;
  const finalPeriodStart = periodStart ?? mapping.extracted_period_start;
  const finalPeriodEnd = periodEnd ?? mapping.extracted_period_end;
  const finalValue = value ?? extractedValue?.raw ?? "";

  if (!finalMetricName || !finalPeriodStart || !finalPeriodEnd || !finalValue) {
    return jsonError("Missing required metric data.", 400);
  }

  // For updates: if the period changed, we need to delete the old value first
  if (action === "update" && mapping.metric_value_id) {
    const { data: oldValue } = await admin
      .from("company_metric_values")
      .select("id, period_start, period_end")
      .eq("id", mapping.metric_value_id)
      .single();

    if (oldValue) {
      const periodChanged =
        oldValue.period_start !== finalPeriodStart ||
        oldValue.period_end !== finalPeriodEnd;

      console.log("[extraction-review] Update check:", {
        oldPeriodStart: oldValue.period_start,
        oldPeriodEnd: oldValue.period_end,
        newPeriodStart: finalPeriodStart,
        newPeriodEnd: finalPeriodEnd,
        periodChanged,
      });

      if (periodChanged) {
        // Delete the old value since we're moving to a new period
        console.log("[extraction-review] Deleting old value:", mapping.metric_value_id);
        await admin
          .from("company_metric_values")
          .delete()
          .eq("id", mapping.metric_value_id);
      }
    }
  }

  // Check if a value already exists for this metric+period
  const { data: existing } = await admin
    .from("company_metric_values")
    .select("id, value, source")
    .eq("company_id", doc.company_id)
    .eq("metric_name", finalMetricName)
    .eq("period_type", finalPeriodType)
    .eq("period_start", finalPeriodStart)
    .eq("period_end", finalPeriodEnd)
    .maybeSingle();

  let metricValueId: string;

  if (existing) {
    // Create history entry before overwriting
    await admin.from("metric_value_history").insert({
      metric_value_id: existing.id,
      previous_value: existing.value,
      new_value: { raw: finalValue },
      previous_source: existing.source,
      new_source: "ai_extracted",
      changed_by: user.id,
      change_reason: "Accepted AI-extracted value from document",
    });

    // Update existing value
    const { error: updateErr } = await admin
      .from("company_metric_values")
      .update({
        value: { raw: finalValue },
        source: "ai_extracted",
        source_document_id: documentId,
        ai_confidence: mapping.confidence_score,
        submitted_by: user.id,
        notes: notes ?? null,
      })
      .eq("id", existing.id);

    if (updateErr) return jsonError(updateErr.message, 400);
    metricValueId = existing.id;
  } else {
    // Insert new value
    const { data: inserted, error: insertErr } = await admin
      .from("company_metric_values")
      .insert({
        company_id: doc.company_id,
        metric_name: finalMetricName,
        period_type: finalPeriodType,
        period_start: finalPeriodStart,
        period_end: finalPeriodEnd,
        value: { raw: finalValue },
        submitted_by: user.id,
        source: "ai_extracted",
        source_document_id: documentId,
        ai_confidence: mapping.confidence_score,
        notes: notes ?? null,
      })
      .select("id")
      .single();

    if (insertErr) return jsonError(insertErr.message, 400);
    metricValueId = inserted.id;
  }

  console.log("[extraction-review] Metric value saved:", {
    metricValueId,
    metricName: finalMetricName,
    periodStart: finalPeriodStart,
    periodEnd: finalPeriodEnd,
    action,
  });

  // Update the mapping with the linked metric value and corrected period
  const mappingUpdate = {
    status: "accepted",
    metric_value_id: metricValueId,
    // Update the mapping's period fields if they were overridden
    ...(periodStart && { extracted_period_start: finalPeriodStart }),
    ...(periodEnd && { extracted_period_end: finalPeriodEnd }),
    ...(metricName && { extracted_metric_name: finalMetricName }),
  };

  console.log("[extraction-review] Updating mapping:", mappingUpdate);

  await admin
    .from("document_metric_mappings")
    .update(mappingUpdate)
    .eq("id", mappingId);

  return NextResponse.json({ ok: true, action: action === "update" ? "updated" : "accepted", metricValueId });
}

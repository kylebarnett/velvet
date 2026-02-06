import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const batchSchema = z.object({
  companyId: z.string().uuid(),
  submissions: z
    .array(
      z.object({
        metricName: z.string().min(1),
        periodType: z.enum(["monthly", "quarterly", "annual"]),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        value: z.string().min(1).refine((v) => !isNaN(Number(v)), { message: "Value must be a number" }),
        notes: z.string().optional(),
        source: z.enum(["manual", "ai_extracted", "override"]).optional(),
        sourceDocumentId: z.string().uuid().optional(),
        changeReason: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
  // Request IDs to mark as fulfilled — passed directly from the UI
  // which knows exactly which requests are being addressed.
  fulfillRequestIds: z.array(z.string().uuid()).optional(),
});

export async function POST(req: Request) {
  const parsed = batchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const { companyId, submissions, fulfillRequestIds } = parsed.data;

  // Verify the founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized for this company.", 403);

  let submitted = 0;
  const errors: string[] = [];

  for (const sub of submissions) {
    const { error } = await supabase
      .from("company_metric_values")
      .upsert(
        {
          company_id: companyId,
          metric_name: sub.metricName,
          period_type: sub.periodType,
          period_start: sub.periodStart,
          period_end: sub.periodEnd,
          value: { raw: sub.value },
          notes: sub.notes || null,
          submitted_by: user.id,
          source: sub.source ?? "manual",
          source_document_id: sub.sourceDocumentId ?? null,
        },
        {
          onConflict:
            "company_id,metric_name,period_type,period_start,period_end",
        },
      );

    if (error) {
      errors.push(`${sub.metricName}: Failed to submit.`);
    } else {
      submitted++;
    }
  }

  // Directly mark the specified requests as fulfilled.
  // The UI passes the exact request IDs that correspond to the submitted
  // metrics, so no fragile name/date matching is needed.
  if (submitted > 0 && fulfillRequestIds && fulfillRequestIds.length > 0) {
    try {
      const admin = createSupabaseAdminClient();

      // Verify these requests belong to this company before updating
      const { data: validRequests } = await admin
        .from("metric_requests")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .in("id", fulfillRequestIds);

      const validIds = (validRequests ?? []).map((r) => r.id);

      if (validIds.length > 0) {
        const { error: updateError } = await admin
          .from("metric_requests")
          .update({
            status: "submitted",
            updated_at: new Date().toISOString(),
          })
          .in("id", validIds);

        if (updateError) {
          console.error("Failed to fulfill requests:", updateError);
        }
      }
    } catch (e) {
      // Non-fatal — the values were submitted successfully
      console.error("Failed to auto-fulfill requests:", e);
    }
  }

  return NextResponse.json({
    submitted,
    failed: errors.length,
    errors,
  });
}

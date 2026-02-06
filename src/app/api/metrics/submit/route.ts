import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  companyId: z.string().uuid(),
  metricName: z.string().min(1),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  value: z.string().min(1).refine((v) => !isNaN(Number(v)), { message: "Value must be a number" }),
  notes: z.string().optional(),
  source: z.enum(["manual", "ai_extracted", "override"]).optional(),
  sourceDocumentId: z.string().uuid().optional(),
  changeReason: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const {
    companyId,
    metricName,
    periodType,
    periodStart,
    periodEnd,
    value,
    notes,
    source,
    sourceDocumentId,
    changeReason,
  } = parsed.data;

  // Verify the founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized for this company.", 403);

  const admin = createSupabaseAdminClient();
  const effectiveSource = source ?? "manual";

  // Check if value already exists to create history entry
  const { data: existing } = await admin
    .from("company_metric_values")
    .select("id, value, source")
    .eq("company_id", companyId)
    .eq("metric_name", metricName)
    .eq("period_type", periodType)
    .eq("period_start", periodStart)
    .eq("period_end", periodEnd)
    .maybeSingle();

  // Upsert into company_metric_values
  const { data: submission, error } = await supabase
    .from("company_metric_values")
    .upsert(
      {
        company_id: companyId,
        metric_name: metricName,
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        value: { raw: value },
        submitted_by: user.id,
        notes: notes ?? null,
        source: effectiveSource,
        source_document_id: sourceDocumentId ?? null,
      },
      {
        onConflict: "company_id,metric_name,period_type,period_start,period_end",
      },
    )
    .select("id")
    .single();

  if (error) return jsonError(error.message, 400);

  // Create history entry if this was an update
  if (existing) {
    await admin.from("metric_value_history").insert({
      metric_value_id: submission.id,
      previous_value: existing.value,
      new_value: { raw: value },
      previous_source: existing.source ?? "manual",
      new_source: effectiveSource,
      changed_by: user.id,
      change_reason: changeReason ?? null,
    });
  }

  return NextResponse.json({ id: submission.id, ok: true });
}

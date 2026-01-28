import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const schema = z.object({
  companyId: z.string().uuid(),
  metricName: z.string().min(1),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  value: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const { companyId, metricName, periodType, periodStart, periodEnd, value, notes } =
    parsed.data;

  // Verify the founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized for this company.", 403);

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
      },
      {
        onConflict: "company_id,metric_name,period_type,period_start,period_end",
      },
    )
    .select("id")
    .single();

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ id: submission.id, ok: true });
}

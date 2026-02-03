import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const batchSchema = z.object({
  companyId: z.string().uuid(),
  submissions: z
    .array(
      z.object({
        metricName: z.string().min(1),
        periodType: z.enum(["monthly", "quarterly", "annual"]),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        value: z.string().min(1),
        notes: z.string().optional(),
      }),
    )
    .min(1)
    .max(100),
});

export async function POST(req: Request) {
  const parsed = batchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const { companyId, submissions } = parsed.data;

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

  return NextResponse.json({
    submitted,
    failed: errors.length,
    errors,
  });
}

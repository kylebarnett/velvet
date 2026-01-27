import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const schema = z.object({
  companyId: z.string().uuid().or(z.string().min(1)),
  metricName: z.string().min(2),
  periodType: z.enum(["monthly", "quarterly", "annual"]),
  periodStart: z.string().min(1),
  periodEnd: z.string().min(1),
  dueDate: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = (user.user_metadata?.role as string | undefined) ?? null;
  if (role !== "investor") return jsonError("Forbidden", 403);

  const { companyId, metricName, periodType, periodStart, periodEnd, dueDate } =
    parsed.data;

  // Create (or reuse) a metric definition for this investor.
  const { data: metricDef, error: defError } = await supabase
    .from("metric_definitions")
    .insert({
      investor_id: user.id,
      name: metricName,
      period_type: periodType,
      data_type: "number",
    })
    .select("id")
    .single();

  if (defError) return jsonError(defError.message, 400);

  const { data: requestRow, error: reqError } = await supabase
    .from("metric_requests")
    .insert({
      investor_id: user.id,
      company_id: companyId,
      metric_definition_id: metricDef.id,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (reqError) return jsonError(reqError.message, 400);

  // TODO: trigger email notification (Edge Function) for founder.

  return NextResponse.json({ id: requestRow.id });
}


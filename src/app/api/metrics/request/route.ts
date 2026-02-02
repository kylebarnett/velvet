import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import {
  calculatePeriodDates,
  isValidQuarter,
  isValidYear,
  type PeriodInput,
} from "@/lib/utils/period";

const schema = z
  .object({
    companyId: z.string().uuid(),
    metricName: z.string().min(2),
    periodType: z.enum(["quarterly", "annual"]),
    year: z.number().int(),
    quarter: z.number().int().min(1).max(4).optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      // Quarter is required for quarterly period type
      if (data.periodType === "quarterly" && data.quarter === undefined) {
        return false;
      }
      return true;
    },
    { message: "Quarter is required for quarterly period type." }
  );

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = (user.user_metadata?.role as string | undefined) ?? null;
  if (role !== "investor") return jsonError("Forbidden", 403);

  const { companyId, metricName, periodType, year, quarter, dueDate } =
    parsed.data;

  // Validate year
  if (!isValidYear(year)) {
    return jsonError("Invalid year.", 400);
  }

  // Validate quarter if quarterly
  if (periodType === "quarterly" && !isValidQuarter(quarter!)) {
    return jsonError("Invalid quarter.", 400);
  }

  // Calculate period dates
  const periodInput: PeriodInput =
    periodType === "quarterly"
      ? { type: "quarterly", year, quarter: quarter as 1 | 2 | 3 | 4 }
      : { type: "annual", year };
  const { periodStart, periodEnd } = calculatePeriodDates(periodInput);

  // Verify investor has a relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return jsonError("Company not in your portfolio.", 403);
  }

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


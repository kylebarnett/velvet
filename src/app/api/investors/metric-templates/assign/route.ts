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
    templateId: z.string().min(1),
    companyIds: z.array(z.string().uuid()).min(1),
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

// POST - Bulk assign a template to multiple companies
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { templateId, companyIds, periodType, year, quarter, dueDate } =
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

  // Fetch template items (allow system templates or user's own)
  const { data: template } = await supabase
    .from("metric_templates")
    .select(`
      id,
      is_system,
      metric_template_items (
        metric_name,
        period_type,
        data_type
      )
    `)
    .eq("id", templateId)
    .or(`is_system.eq.true,investor_id.eq.${user.id}`)
    .single();

  if (!template) return jsonError("Template not found.", 404);

  const items = template.metric_template_items as {
    metric_name: string;
    period_type: string;
    data_type: string;
  }[];

  if (!items.length) return jsonError("Template has no metrics.", 400);

  // Verify investor has relationships with all companies
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id")
    .eq("investor_id", user.id)
    .in("company_id", companyIds);

  const validCompanyIds = new Set((relationships ?? []).map((r) => r.company_id));
  const invalidCompanyIds = companyIds.filter((id) => !validCompanyIds.has(id));

  if (invalidCompanyIds.length > 0) {
    return jsonError(`Companies not in portfolio: ${invalidCompanyIds.length}`, 403);
  }

  let requestsCreated = 0;
  let skipped = 0;

  for (const companyId of companyIds) {
    for (const item of items) {
      // Upsert metric definition for this investor
      const { data: metricDef, error: defError } = await supabase
        .from("metric_definitions")
        .insert({
          investor_id: user.id,
          name: item.metric_name,
          period_type: item.period_type,
          data_type: item.data_type,
        })
        .select("id")
        .single();

      if (defError || !metricDef) {
        skipped++;
        continue;
      }

      // Check if request already exists for this company + metric + period
      const { data: existingRequest } = await supabase
        .from("metric_requests")
        .select("id")
        .eq("investor_id", user.id)
        .eq("company_id", companyId)
        .eq("metric_definition_id", metricDef.id)
        .eq("period_start", periodStart)
        .eq("period_end", periodEnd)
        .maybeSingle();

      if (existingRequest) {
        skipped++;
        continue;
      }

      // Create the request
      const { error: reqError } = await supabase
        .from("metric_requests")
        .insert({
          investor_id: user.id,
          company_id: companyId,
          metric_definition_id: metricDef.id,
          period_start: periodStart,
          period_end: periodEnd,
          due_date: dueDate ?? null,
          status: "pending",
        });

      if (reqError) {
        skipped++;
      } else {
        requestsCreated++;
      }
    }
  }

  return NextResponse.json({
    ok: true,
    requestsCreated,
    skipped,
  });
}

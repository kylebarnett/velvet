import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Deduplicated metric requests for the founder's company
// Groups by metric_name + period, shows requesting investor count
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  // Fetch all pending metric requests for this company (RLS ensures only approved investors' requests)
  const { data: requests, error } = await supabase
    .from("metric_requests")
    .select(`
      id,
      period_start,
      period_end,
      status,
      due_date,
      created_at,
      investor_id,
      metric_definitions (
        name,
        period_type
      )
    `)
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  // Check which metrics already have submissions
  const { data: existingValues } = await supabase
    .from("company_metric_values")
    .select("metric_name, period_type, period_start, period_end")
    .eq("company_id", company.id);

  const submittedSet = new Set(
    (existingValues ?? []).map(
      (v) => `${v.metric_name.toLowerCase()}|${v.period_type}|${v.period_start}|${v.period_end}`,
    ),
  );

  // Group requests by metric + period
  type GroupedRequest = {
    metricName: string;
    periodType: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string | null;
    status: string;
    investorCount: number;
    requestIds: string[];
    hasSubmission: boolean;
  };

  const groups = new Map<string, GroupedRequest>();

  for (const req of requests ?? []) {
    const defRaw = req.metric_definitions;
    const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as { name: string; period_type: string } | null;
    if (!def) continue;

    const key = `${def.name.toLowerCase()}|${def.period_type}|${req.period_start}|${req.period_end}`;
    const existing = groups.get(key);

    if (existing) {
      existing.investorCount++;
      existing.requestIds.push(req.id);
      // Use earliest due date
      if (req.due_date && (!existing.dueDate || req.due_date < existing.dueDate)) {
        existing.dueDate = req.due_date;
      }
    } else {
      groups.set(key, {
        metricName: def.name,
        periodType: def.period_type,
        periodStart: req.period_start,
        periodEnd: req.period_end,
        dueDate: req.due_date,
        status: req.status,
        investorCount: 1,
        requestIds: [req.id],
        hasSubmission: submittedSet.has(key),
      });
    }
  }

  return NextResponse.json({
    companyId: company.id,
    requests: Array.from(groups.values()),
  });
}

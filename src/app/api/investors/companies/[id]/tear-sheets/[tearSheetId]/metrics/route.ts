import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";

type MetricValue = {
  metric_name: string;
  value: unknown;
  period_type: string;
  period_start: string;
  period_end: string;
};

function getNumericValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const v = (value as Record<string, unknown>).value;
    if (typeof v === "number") return v.toString();
    if (typeof v === "string") return v;
    // Handle { raw: "..." } format
    const raw = (value as Record<string, unknown>).raw;
    if (typeof raw === "string") return raw;
  }
  return null;
}

function getQuarterDates(quarter: string, year: number): { start: string; end: string } {
  const quarterNum = parseInt(quarter.replace("Q", ""), 10);
  const startMonth = (quarterNum - 1) * 3;
  const endMonth = startMonth + 2;

  const start = new Date(year, startMonth, 1);
  const end = new Date(year, endMonth + 1, 0); // Last day of the quarter

  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function getPreviousQuarter(quarter: string, year: number): { quarter: string; year: number } {
  const quarterNum = parseInt(quarter.replace("Q", ""), 10);
  if (quarterNum === 1) {
    return { quarter: "Q4", year: year - 1 };
  }
  return { quarter: `Q${quarterNum - 1}`, year };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; tearSheetId: string }> }
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId, tearSheetId } = await params;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .in("approval_status", ["auto_approved", "approved"])
    .single();

  if (!relationship) {
    return jsonError("Company not in portfolio or not approved.", 403);
  }

  // Fetch the tear sheet to get quarter and year
  const { data: tearSheet, error: tsError } = await supabase
    .from("tear_sheets")
    .select("id, quarter, year, content")
    .eq("id", tearSheetId)
    .eq("company_id", companyId)
    .eq("status", "published")
    .single();

  if (tsError || !tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  const { quarter, year } = tearSheet;
  const visibleMetrics = (tearSheet.content as Record<string, unknown>)?.visibleMetrics as string[] | undefined;

  // Calculate date ranges for current and previous quarter
  const currentDates = getQuarterDates(quarter, year);
  const prev = getPreviousQuarter(quarter, year);
  const prevDates = getQuarterDates(prev.quarter, prev.year);

  // Fetch current quarter metrics
  const { data: currentMetrics } = await supabase
    .from("company_metric_values")
    .select("metric_name, value, period_type, period_start, period_end")
    .eq("company_id", companyId)
    .gte("period_start", currentDates.start)
    .lte("period_end", currentDates.end);

  // Fetch previous quarter metrics
  const { data: prevMetrics } = await supabase
    .from("company_metric_values")
    .select("metric_name, value, period_type, period_start, period_end")
    .eq("company_id", companyId)
    .gte("period_start", prevDates.start)
    .lte("period_end", prevDates.end);

  // Build metrics response
  const currentMap = new Map<string, MetricValue>();
  for (const m of (currentMetrics ?? []) as MetricValue[]) {
    const key = m.metric_name.toLowerCase();
    if (!currentMap.has(key)) {
      currentMap.set(key, m);
    }
  }

  const prevMap = new Map<string, MetricValue>();
  for (const m of (prevMetrics ?? []) as MetricValue[]) {
    const key = m.metric_name.toLowerCase();
    if (!prevMap.has(key)) {
      prevMap.set(key, m);
    }
  }

  const metrics = Array.from(currentMap.entries()).map(([key, current]) => {
    const prev = prevMap.get(key);
    const currentValue = getNumericValue(current.value);
    const previousValue = prev ? getNumericValue(prev.value) : null;

    let trend: "up" | "down" | "flat" = "flat";
    if (currentValue != null && previousValue != null) {
      const c = parseFloat(currentValue);
      const p = parseFloat(previousValue);
      if (!isNaN(c) && !isNaN(p)) {
        if (c > p) trend = "up";
        else if (c < p) trend = "down";
      }
    }

    return {
      metricName: current.metric_name,
      currentValue,
      previousValue,
      trend,
      periodType: current.period_type,
      periodStart: current.period_start,
      periodEnd: current.period_end,
    };
  });

  // Filter to visible metrics if specified
  const filteredMetrics = visibleMetrics && visibleMetrics.length > 0
    ? metrics.filter((m) => visibleMetrics.includes(m.metricName))
    : metrics;

  return NextResponse.json({ metrics: filteredMetrics });
}

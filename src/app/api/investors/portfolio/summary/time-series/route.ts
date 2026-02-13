import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  extractNumericValue,
  canSumMetric,
  formatPeriodKey,
  formatPeriodLabel,
} from "@/lib/reports/aggregation";
import { logger } from "@/lib/logger";

type MetricValue = {
  id: string;
  company_id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
};

const VALID_PERIOD_TYPES = new Set(["monthly", "quarterly", "yearly"]);

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Rate limit: 60 reads/min per user
  const { allowed, retryAfter } = checkRateLimit(`time-series-read:${user.id}`, 60, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const url = new URL(req.url);
  const metric = url.searchParams.get("metric")?.slice(0, 100) ?? null;
  const periodType = url.searchParams.get("periodType") ?? "quarterly";
  const periodsParam = url.searchParams.get("periods");
  const periods = periodsParam ? Math.min(Math.max(parseInt(periodsParam, 10) || 8, 1), 24) : 8;
  const industriesParam = url.searchParams.get("industries");
  const stagesParam = url.searchParams.get("stages");

  if (!metric || metric.trim().length === 0) {
    return jsonError("Missing required query parameter: metric", 400);
  }

  if (!VALID_PERIOD_TYPES.has(periodType)) {
    return jsonError("Invalid periodType. Must be monthly, quarterly, or yearly.", 400);
  }

  const industryFilters = industriesParam?.split(",").filter(Boolean) ?? [];
  const stageFilters = stagesParam?.split(",").filter(Boolean) ?? [];

  // Fetch approved companies
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      approval_status,
      companies (
        id,
        name,
        industry,
        stage
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) {
    logger.error("Failed to fetch relationships:", relError.message);
    return jsonError("Failed to process request.", 500);
  }

  const companyIds: string[] = [];

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const companyData = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string; industry: string | null; stage: string | null } | undefined)
      : (companyRaw as { id: string; name: string; industry: string | null; stage: string | null } | null);

    if (!companyData) continue;

    if (industryFilters.length > 0 && !industryFilters.includes(companyData.industry ?? "")) continue;
    if (stageFilters.length > 0 && !stageFilters.includes(companyData.stage ?? "")) continue;

    companyIds.push(companyData.id);
  }

  if (companyIds.length === 0) {
    return NextResponse.json(
      { metric, periodType, dataPoints: [] },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  }

  // Escape ILIKE wildcards
  const escapedMetric = metric.replace(/[%_]/g, "\\$&").trim();

  // Fetch metric values
  const { data: metricValues, error: mvError } = await supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds)
    .eq("period_type", periodType)
    .ilike("metric_name", escapedMetric)
    .order("period_start", { ascending: true });

  if (mvError) {
    logger.error("Failed to fetch metric values:", mvError.message);
    return jsonError("Failed to process request.", 500);
  }

  const values = (metricValues ?? []) as MetricValue[];
  const isSummable = canSumMetric(metric);

  // Group by period, then by company (one value per company per period, keep latest if dupes)
  const periodCompanyValues = new Map<string, Map<string, number>>();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const periodKey = formatPeriodKey(mv.period_start, periodType);

    if (!periodCompanyValues.has(periodKey)) {
      periodCompanyValues.set(periodKey, new Map());
    }
    // Keep latest value per company per period (overwrite — values are ordered by period_start asc)
    periodCompanyValues.get(periodKey)!.set(mv.company_id, numValue);
  }

  // Sort periods and take most recent N
  const sortedPeriods = [...periodCompanyValues.keys()].sort();
  const recentPeriods = sortedPeriods.slice(-periods);

  // Aggregate each period
  const dataPoints: Array<{
    period: string;
    label: string;
    value: number;
    companyCount: number;
  }> = [];

  for (const periodKey of recentPeriods) {
    const companyMap = periodCompanyValues.get(periodKey)!;
    const vals = Array.from(companyMap.values());

    if (vals.length === 0) continue;

    const aggregatedValue = isSummable
      ? vals.reduce((sum, v) => sum + v, 0)
      : vals.reduce((sum, v) => sum + v, 0) / vals.length;

    dataPoints.push({
      period: periodKey,
      label: formatPeriodLabel(periodKey, periodType),
      value: Math.round(aggregatedValue * 100) / 100,
      companyCount: vals.length,
    });
  }

  return NextResponse.json(
    { metric, periodType, dataPoints },
    { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
  );
}

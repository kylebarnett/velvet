import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import {
  extractNumericValue,
  aggregateMetricValues,
  canSumMetric,
  calculateGrowthRate,
  REVENUE_PRIORITY,
} from "@/lib/reports/aggregation";
import { INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/constants/industries";
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

type CompanyInfo = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
  logoUrl: string | null;
};

const VALID_TIME_RANGES = new Set(["latest", "last_quarter", "last_year", "all"]);

// Priority KPIs for drilldown
const DRILLDOWN_METRICS = ["revenue", "mrr", "arr", "burn rate", "headcount", "gross margin"];

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const timeRange = url.searchParams.get("timeRange") ?? "latest";
  const industriesParam = url.searchParams.get("industries");
  const stagesParam = url.searchParams.get("stages");

  if (!VALID_TIME_RANGES.has(timeRange)) {
    return jsonError("Invalid timeRange. Must be latest, last_quarter, last_year, or all.", 400);
  }

  const industryFilters = industriesParam?.split(",").filter(Boolean) ?? [];
  const stageFilters = stagesParam?.split(",").filter(Boolean) ?? [];

  // Fetch approved companies
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      approval_status,
      logo_url,
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

  const companies: CompanyInfo[] = [];
  const companyIds: string[] = [];
  const industryCounts = new Map<string, number>();
  const stageCounts = new Map<string, number>();

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const companyData = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string; industry: string | null; stage: string | null } | undefined)
      : (companyRaw as { id: string; name: string; industry: string | null; stage: string | null } | null);

    if (!companyData) continue;

    if (industryFilters.length > 0 && !industryFilters.includes(companyData.industry ?? "")) continue;
    if (stageFilters.length > 0 && !stageFilters.includes(companyData.stage ?? "")) continue;

    companies.push({
      id: companyData.id,
      name: companyData.name,
      industry: companyData.industry,
      stage: companyData.stage,
      logoUrl: rel.logo_url,
    });
    companyIds.push(companyData.id);

    const industry = companyData.industry ?? "unspecified";
    industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    const stage = companyData.stage ?? "unspecified";
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  }

  if (companyIds.length === 0) {
    return NextResponse.json(
      {
        aggregates: {},
        totalCompanies: 0,
        companiesWithData: 0,
        byIndustry: [],
        byStage: [],
        byCompany: [],
        drilldownData: {},
        freshness: { recent: 0, aging: 0, stale: 0, noData: 0 },
      },
      { headers: { "Cache-Control": "private, max-age=60, stale-while-revalidate=120" } }
    );
  }

  // Fetch metric values — apply date filter for time ranges
  let query = supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds);

  if (timeRange === "last_quarter") {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    query = query.gte("period_start", cutoff.toISOString().split("T")[0]);
  } else if (timeRange === "last_year") {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1);
    query = query.gte("period_start", cutoff.toISOString().split("T")[0]);
  }
  // "latest" and "all" fetch everything; "latest" deduplicates below

  const { data: metricValues, error: mvError } = await query;

  if (mvError) {
    logger.error("Failed to fetch metric values:", mvError.message);
    return jsonError("Failed to process request.", 500);
  }

  const values = (metricValues ?? []) as MetricValue[];

  // Deduplicate: keep only the latest value per company per metric
  const latestByMetric = new Map<string, Map<string, { value: number; periodStart: string }>>();
  const companiesWithMetrics = new Set<string>();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const metricName = mv.metric_name.toLowerCase().trim();
    companiesWithMetrics.add(mv.company_id);

    if (!latestByMetric.has(metricName)) {
      latestByMetric.set(metricName, new Map());
    }
    const companyMap = latestByMetric.get(metricName)!;
    const existing = companyMap.get(mv.company_id);

    if (!existing || mv.period_start > existing.periodStart) {
      companyMap.set(mv.company_id, { value: numValue, periodStart: mv.period_start });
    }
  }

  // For "all" time range, don't deduplicate — use all values
  // For "latest" / "last_quarter" / "last_year", deduplicate to one value per company per metric
  const metricGroups = new Map<string, number[]>();

  if (timeRange === "all") {
    // Use all values (original behavior for "all time")
    for (const mv of values) {
      const numValue = extractNumericValue(mv.value);
      if (numValue === null) continue;
      const metricName = mv.metric_name.toLowerCase().trim();
      if (!metricGroups.has(metricName)) metricGroups.set(metricName, []);
      metricGroups.get(metricName)!.push(numValue);
    }
  } else {
    // Deduplicated: one value per company per metric
    for (const [metricName, companyMap] of latestByMetric) {
      metricGroups.set(metricName, Array.from(companyMap.values()).map((e) => e.value));
    }
  }

  // Aggregates
  const aggregates: Record<string, {
    sum: number | null;
    average: number;
    median: number;
    min: number;
    max: number;
    count: number;
    canSum: boolean;
  }> = {};

  for (const [metricName, vals] of metricGroups) {
    const agg = aggregateMetricValues(vals);
    const isSummable = canSumMetric(metricName);
    aggregates[metricName] = {
      sum: isSummable ? agg.sum : null,
      average: agg.average,
      median: agg.median,
      min: agg.min,
      max: agg.max,
      count: agg.count,
      canSum: isSummable,
    };
  }

  // Data freshness
  const companyLatestDate = new Map<string, string>();
  for (const companyMap of latestByMetric.values()) {
    for (const [companyId, entry] of companyMap) {
      const existing = companyLatestDate.get(companyId);
      if (!existing || entry.periodStart > existing) {
        companyLatestDate.set(companyId, entry.periodStart);
      }
    }
  }

  const now = new Date();
  let freshnessRecent = 0;
  let freshnessAging = 0;
  let freshnessStale = 0;
  let freshnessNoData = 0;

  for (const company of companies) {
    const latest = companyLatestDate.get(company.id);
    if (!latest) { freshnessNoData++; continue; }
    const daysDiff = Math.floor((now.getTime() - new Date(latest).getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 90) freshnessRecent++;
    else if (daysDiff < 180) freshnessAging++;
    else freshnessStale++;
  }

  const freshness = { recent: freshnessRecent, aging: freshnessAging, stale: freshnessStale, noData: freshnessNoData };

  // Drilldown data
  const drilldownData: Record<string, Array<{
    companyId: string;
    companyName: string;
    logoUrl: string | null;
    industry: string | null;
    stage: string | null;
    value: number;
    percentOfTotal: number;
    growth: number | null;
  }>> = {};

  for (const metric of DRILLDOWN_METRICS) {
    const companyLatestValues = new Map<string, { value: number; previous: number | null; periodStart: string }>();

    for (const mv of values) {
      const metricName = mv.metric_name.toLowerCase().trim();
      if (metricName !== metric) continue;

      const numValue = extractNumericValue(mv.value);
      if (numValue === null) continue;

      const existing = companyLatestValues.get(mv.company_id);
      if (!existing) {
        companyLatestValues.set(mv.company_id, { value: numValue, previous: null, periodStart: mv.period_start });
      } else {
        const existingDate = new Date(existing.periodStart).getTime();
        const currentDate = new Date(mv.period_start).getTime();

        if (currentDate > existingDate) {
          existing.previous = existing.value;
          existing.value = numValue;
          existing.periodStart = mv.period_start;
        } else if (currentDate < existingDate && existing.previous === null) {
          existing.previous = numValue;
        }
      }
    }

    const total = Array.from(companyLatestValues.values()).reduce((sum, d) => sum + d.value, 0);

    const breakdown: typeof drilldownData[string] = [];
    for (const company of companies) {
      const data = companyLatestValues.get(company.id);
      if (!data) continue;
      const growth = data.previous !== null ? calculateGrowthRate(data.value, data.previous) : null;
      breakdown.push({
        companyId: company.id,
        companyName: company.name,
        logoUrl: company.logoUrl,
        industry: company.industry,
        stage: company.stage,
        value: data.value,
        percentOfTotal: total > 0 ? (data.value / total) * 100 : 0,
        growth,
      });
    }

    breakdown.sort((a, b) => b.value - a.value);
    if (breakdown.length > 0) drilldownData[metric] = breakdown;
  }

  // Company breakdown
  const byCompany: Array<{
    companyId: string;
    companyName: string;
    industry: string | null;
    stage: string | null;
    revenueMetric: string | null;
    revenueGrowth: number | null;
  }> = [];

  for (const company of companies) {
    const companyValues = values
      .filter((v) => v.company_id === company.id)
      .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

    const metricLatest = new Map<string, { latest: number; previous: number | null }>();
    for (const mv of companyValues) {
      const metricName = mv.metric_name.toLowerCase().trim();
      const numValue = extractNumericValue(mv.value);
      if (numValue === null) continue;

      if (!metricLatest.has(metricName)) {
        metricLatest.set(metricName, { latest: numValue, previous: null });
      } else {
        const existing = metricLatest.get(metricName)!;
        if (existing.previous === null) existing.previous = numValue;
      }
    }

    let revenueMetric: string | null = null;
    let revenueGrowth: number | null = null;
    for (const revMetric of REVENUE_PRIORITY) {
      if (metricLatest.has(revMetric)) {
        const revData = metricLatest.get(revMetric)!;
        revenueMetric = revMetric;
        revenueGrowth = revData.previous !== null ? calculateGrowthRate(revData.latest, revData.previous) : null;
        break;
      }
    }

    byCompany.push({
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      stage: company.stage,
      revenueMetric,
      revenueGrowth,
    });
  }

  byCompany.sort((a, b) => {
    if (a.revenueGrowth === null && b.revenueGrowth === null) return 0;
    if (a.revenueGrowth === null) return 1;
    if (b.revenueGrowth === null) return -1;
    return b.revenueGrowth - a.revenueGrowth;
  });

  // Distribution data
  const byIndustry = [...industryCounts.entries()]
    .map(([key, value]) => ({
      name: INDUSTRY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  const byStage = [...stageCounts.entries()]
    .map(([key, value]) => ({
      name: STAGE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => {
      const stageOrder = ["seed", "series_a", "series_b", "series_c", "growth", "unspecified"];
      return stageOrder.indexOf(a.key) - stageOrder.indexOf(b.key);
    });

  return NextResponse.json(
    {
      aggregates,
      totalCompanies: companies.length,
      companiesWithData: companiesWithMetrics.size,
      byIndustry,
      byStage,
      byCompany,
      drilldownData,
      freshness,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

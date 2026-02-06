import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import {
  extractNumericValue,
  calculateGrowthRate,
  calculateMedian,
  formatPeriodKey,
  formatPeriodLabel,
} from "@/lib/reports/aggregation";

type MetricValue = {
  id: string;
  company_id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
};

type CompanyRow = {
  id: string;
  name: string;
};

const GROWTH_BUCKETS = [
  { label: "<-20%", min: -Infinity, max: -20 },
  { label: "-20% to -10%", min: -20, max: -10 },
  { label: "-10% to 0%", min: -10, max: 0 },
  { label: "0% to 10%", min: 0, max: 10 },
  { label: "10% to 20%", min: 10, max: 20 },
  { label: ">20%", min: 20, max: Infinity },
];

const VALID_PERIOD_TYPES = new Set(["monthly", "quarterly", "yearly"]);

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const metric = url.searchParams.get("metric");
  const periodType = url.searchParams.get("periodType") ?? "quarterly";
  const periodsParam = url.searchParams.get("periods");
  const periods = periodsParam ? Math.min(Math.max(parseInt(periodsParam, 10) || 8, 1), 24) : 8;

  if (!metric || metric.trim().length === 0) {
    return jsonError("Missing required query parameter: metric", 400);
  }

  if (!VALID_PERIOD_TYPES.has(periodType)) {
    return jsonError("Invalid periodType. Must be monthly, quarterly, or yearly.", 400);
  }

  // Get all approved company relationships
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      approval_status,
      companies (
        id,
        name
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) return jsonError(relError.message, 500);

  const companyMap = new Map<string, string>();
  const companyIds: string[] = [];

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = (Array.isArray(companyRaw)
      ? companyRaw[0]
      : companyRaw) as CompanyRow | null;

    if (!company) continue;
    companyMap.set(company.id, company.name);
    companyIds.push(company.id);
  }

  if (companyIds.length === 0) {
    return NextResponse.json({
      metric,
      growthDistribution: GROWTH_BUCKETS.map((b) => ({ bucket: b.label, count: 0 })),
      yoyData: [],
      outliers: [],
    });
  }

  // Fetch metric values for this metric across all approved companies
  const { data: metricValues, error: mvError } = await supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds)
    .eq("period_type", periodType)
    .ilike("metric_name", metric.trim())
    .order("period_start", { ascending: true });

  if (mvError) return jsonError(mvError.message, 500);

  const values = (metricValues ?? []) as MetricValue[];

  // Group values by company and period
  // Map: companyId -> Map<periodKey, numericValue>
  const companyPeriods = new Map<string, Map<string, number>>();
  const allPeriodKeys = new Set<string>();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const periodKey = formatPeriodKey(mv.period_start, periodType);
    allPeriodKeys.add(periodKey);

    if (!companyPeriods.has(mv.company_id)) {
      companyPeriods.set(mv.company_id, new Map());
    }
    companyPeriods.get(mv.company_id)!.set(periodKey, numValue);
  }

  // Sort periods and take the most recent N
  const sortedPeriods = [...allPeriodKeys].sort();
  const recentPeriods = sortedPeriods.slice(-periods);

  // -------------------------------------------------------------------
  // 1) Growth Distribution: calculate period-over-period growth per company
  //    using the two most recent periods each company has data for
  // -------------------------------------------------------------------
  const companyGrowthRates: Array<{ companyId: string; growth: number }> = [];

  for (const [companyId, periodMap] of companyPeriods) {
    // Get the company's data sorted by period key within recent periods
    const companyRecentPeriods = recentPeriods
      .filter((p) => periodMap.has(p))
      .sort();

    if (companyRecentPeriods.length < 2) continue;

    const latestPeriod = companyRecentPeriods[companyRecentPeriods.length - 1];
    const previousPeriod = companyRecentPeriods[companyRecentPeriods.length - 2];

    const latestValue = periodMap.get(latestPeriod)!;
    const previousValue = periodMap.get(previousPeriod)!;

    const growth = calculateGrowthRate(latestValue, previousValue);
    if (growth !== null) {
      companyGrowthRates.push({ companyId, growth });
    }
  }

  // Bucket the growth rates
  const growthDistribution = GROWTH_BUCKETS.map((bucket) => {
    const count = companyGrowthRates.filter((c) => {
      if (bucket.max === Infinity) return c.growth >= bucket.min;
      if (bucket.min === -Infinity) return c.growth < bucket.max;
      return c.growth >= bucket.min && c.growth < bucket.max;
    }).length;
    return { bucket: bucket.label, count };
  });

  // -------------------------------------------------------------------
  // 2) Year-over-Year Comparison
  //    Compare aggregated values for the same period across current and prior year
  // -------------------------------------------------------------------
  const yoyData: Array<{
    period: string;
    label: string;
    currentYear: number | null;
    priorYear: number | null;
  }> = [];

  // Determine the current year and prior year from the most recent period
  const now = new Date();
  const currentYear = now.getFullYear();
  const priorYear = currentYear - 1;

  // Filter to periods that belong to current year or prior year
  const currentYearPeriods = new Map<string, number[]>();
  const priorYearPeriods = new Map<string, number[]>();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const periodDate = new Date(mv.period_start);
    const year = periodDate.getFullYear();
    const periodKey = formatPeriodKey(mv.period_start, periodType);

    // Create a year-agnostic key for matching
    let subKey: string;
    if (periodType === "quarterly") {
      const quarter = Math.floor(periodDate.getMonth() / 3) + 1;
      subKey = `Q${quarter}`;
    } else if (periodType === "monthly") {
      subKey = String(periodDate.getMonth() + 1).padStart(2, "0");
    } else {
      // Yearly: YoY is just year vs year
      subKey = "annual";
    }

    if (year === currentYear) {
      if (!currentYearPeriods.has(subKey)) currentYearPeriods.set(subKey, []);
      currentYearPeriods.get(subKey)!.push(numValue);
    } else if (year === priorYear) {
      if (!priorYearPeriods.has(subKey)) priorYearPeriods.set(subKey, []);
      priorYearPeriods.get(subKey)!.push(numValue);
    }
  }

  // Build YoY data points
  const allSubKeys = new Set([
    ...currentYearPeriods.keys(),
    ...priorYearPeriods.keys(),
  ]);

  const sortedSubKeys = [...allSubKeys].sort((a, b) => {
    if (a === "annual" && b === "annual") return 0;
    return a.localeCompare(b);
  });

  for (const subKey of sortedSubKeys) {
    const currentValues = currentYearPeriods.get(subKey);
    const priorValues = priorYearPeriods.get(subKey);

    const currentAvg =
      currentValues && currentValues.length > 0
        ? currentValues.reduce((s, v) => s + v, 0) / currentValues.length
        : null;
    const priorAvg =
      priorValues && priorValues.length > 0
        ? priorValues.reduce((s, v) => s + v, 0) / priorValues.length
        : null;

    let label: string;
    if (periodType === "quarterly") {
      label = subKey;
    } else if (periodType === "monthly") {
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      label = monthNames[parseInt(subKey, 10) - 1] ?? subKey;
    } else {
      label = "Annual";
    }

    yoyData.push({
      period: subKey,
      label,
      currentYear: currentAvg !== null ? Math.round(currentAvg * 100) / 100 : null,
      priorYear: priorAvg !== null ? Math.round(priorAvg * 100) / 100 : null,
    });
  }

  // -------------------------------------------------------------------
  // 3) Outlier Detection
  //    Companies with growth > 2 standard deviations from the mean
  // -------------------------------------------------------------------
  const outliers: Array<{
    companyId: string;
    companyName: string;
    growth: number;
    direction: "outperforming" | "underperforming";
  }> = [];

  if (companyGrowthRates.length >= 3) {
    const growthValues = companyGrowthRates.map((c) => c.growth);
    const mean = growthValues.reduce((s, v) => s + v, 0) / growthValues.length;
    const variance =
      growthValues.reduce((s, v) => s + (v - mean) ** 2, 0) / growthValues.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > 0) {
      for (const entry of companyGrowthRates) {
        const zScore = (entry.growth - mean) / stdDev;
        if (Math.abs(zScore) > 2) {
          outliers.push({
            companyId: entry.companyId,
            companyName: companyMap.get(entry.companyId) ?? "Unknown",
            growth: Math.round(entry.growth * 100) / 100,
            direction: zScore > 0 ? "outperforming" : "underperforming",
          });
        }
      }
    }
  }

  // Sort outliers by absolute growth descending
  outliers.sort((a, b) => Math.abs(b.growth) - Math.abs(a.growth));

  return NextResponse.json(
    {
      metric,
      periodType,
      periods,
      companyCount: companyPeriods.size,
      companiesWithGrowth: companyGrowthRates.length,
      growthDistribution,
      yoyData,
      outliers,
      currentYear,
      priorYear,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

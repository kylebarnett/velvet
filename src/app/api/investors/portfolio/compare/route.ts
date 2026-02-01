import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import {
  extractNumericValue,
  formatPeriodKey,
  formatPeriodLabel,
  normalizeToIndex,
  calculateGrowthRate,
  aggregateMetricValues,
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

// GET - Side-by-side comparison for selected companies
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const companyIdsParam = url.searchParams.get("companyIds");
  const periodType = url.searchParams.get("periodType") ?? "monthly";
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const normalize = url.searchParams.get("normalize") ?? "absolute";
  const requestedMetrics = url.searchParams.get("metrics")?.split(",").filter(Boolean) ?? [];

  if (!companyIdsParam) {
    return jsonError("companyIds is required.", 400);
  }

  const companyIds = companyIdsParam.split(",").filter(Boolean);

  if (companyIds.length < 2) {
    return jsonError("At least 2 companies required for comparison.", 400);
  }

  if (companyIds.length > 8) {
    return jsonError("Maximum 8 companies can be compared.", 400);
  }

  // Verify investor has approved relationships with all companies
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
    .in("company_id", companyIds)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) return jsonError(relError.message, 500);

  const approvedCompanyIds = new Set(
    (relationships ?? []).map((r) => r.company_id)
  );

  // Check all requested companies are approved
  for (const id of companyIds) {
    if (!approvedCompanyIds.has(id)) {
      return jsonError(`Company ${id} not in approved portfolio.`, 403);
    }
  }

  // Build company info map
  const companyInfo = new Map<string, { name: string; industry: string | null; stage: string | null }>();
  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string; industry: string | null; stage: string | null } | undefined)
      : (companyRaw as { id: string; name: string; industry: string | null; stage: string | null } | null);

    if (company) {
      companyInfo.set(company.id, {
        name: company.name,
        industry: company.industry,
        stage: company.stage,
      });
    }
  }

  // Fetch metric values for these companies
  let query = supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds)
    .eq("period_type", periodType);

  if (startDate) {
    query = query.gte("period_start", startDate);
  }
  if (endDate) {
    query = query.lte("period_start", endDate);
  }

  const { data: metricValues, error: mvError } = await query;
  if (mvError) return jsonError(mvError.message, 500);

  const values = (metricValues ?? []) as MetricValue[];

  // Find common metrics across companies
  const metricsByCompany = new Map<string, Set<string>>();
  for (const mv of values) {
    const metricName = mv.metric_name.toLowerCase().trim();
    if (!metricsByCompany.has(mv.company_id)) {
      metricsByCompany.set(mv.company_id, new Set());
    }
    metricsByCompany.get(mv.company_id)!.add(metricName);
  }

  // Find metrics present in all companies (common metrics)
  let commonMetrics: string[] = [];
  if (metricsByCompany.size === companyIds.length) {
    const allSets = [...metricsByCompany.values()];
    if (allSets.length > 0) {
      commonMetrics = [...allSets[0]].filter((metric) =>
        allSets.every((set) => set.has(metric))
      );
    }
  }

  // Filter to requested metrics if specified
  const metricsToCompare =
    requestedMetrics.length > 0
      ? commonMetrics.filter((m) => requestedMetrics.some((r) => r.toLowerCase() === m))
      : commonMetrics;

  // Build time series data for chart
  // Structure: { period: string, [companyName]: value, ... }[]
  const chartData: Array<{
    period: string;
    periodStart: string;
    label: string;
    [key: string]: string | number | null;
  }> = [];

  // Group values by period and company
  const byPeriodAndCompany = new Map<
    string,
    Map<string, Map<string, number>>
  >();

  for (const mv of values) {
    const metricName = mv.metric_name.toLowerCase().trim();
    if (!metricsToCompare.includes(metricName)) continue;

    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const periodKey = formatPeriodKey(mv.period_start, periodType);

    if (!byPeriodAndCompany.has(periodKey)) {
      byPeriodAndCompany.set(periodKey, new Map());
    }
    const periodMap = byPeriodAndCompany.get(periodKey)!;

    if (!periodMap.has(mv.company_id)) {
      periodMap.set(mv.company_id, new Map());
    }
    periodMap.get(mv.company_id)!.set(metricName, numValue);
  }

  // Calculate base values for normalization (first period values)
  const sortedPeriods = [...byPeriodAndCompany.keys()].sort();
  const baseValues = new Map<string, Map<string, number>>();

  if (sortedPeriods.length > 0 && normalize === "indexed") {
    const firstPeriod = byPeriodAndCompany.get(sortedPeriods[0])!;
    for (const [companyId, metrics] of firstPeriod) {
      baseValues.set(companyId, new Map(metrics));
    }
  }

  // Calculate previous period values for percent change
  const previousValues = new Map<string, Map<string, number>>();

  // Build chart data for each metric
  const chartDataByMetric: Record<
    string,
    Array<{ period: string; label: string; [key: string]: string | number | null }>
  > = {};

  for (const metric of metricsToCompare) {
    chartDataByMetric[metric] = [];

    let prevPeriodMap: Map<string, number> | null = null;

    for (const periodKey of sortedPeriods) {
      const periodMap = byPeriodAndCompany.get(periodKey)!;
      const row: { period: string; label: string; [key: string]: string | number | null } = {
        period: periodKey,
        label: formatPeriodLabel(periodKey, periodType),
      };

      for (const companyId of companyIds) {
        const companyName = companyInfo.get(companyId)?.name ?? companyId;
        const companyMetrics = periodMap.get(companyId);
        const rawValue = companyMetrics?.get(metric) ?? null;

        if (rawValue !== null) {
          let displayValue = rawValue;

          if (normalize === "indexed") {
            const baseValue = baseValues.get(companyId)?.get(metric);
            if (baseValue) {
              displayValue = normalizeToIndex(rawValue, baseValue);
            }
          } else if (normalize === "percentChange") {
            const prevValue = prevPeriodMap?.get(companyId);
            if (prevValue !== undefined && prevValue !== null) {
              const growth = calculateGrowthRate(rawValue, prevValue);
              displayValue = growth ?? 0;
            } else {
              displayValue = 0;
            }
          }

          row[companyName] = Math.round(displayValue * 100) / 100;
        } else {
          row[companyName] = null;
        }
      }

      chartDataByMetric[metric].push(row);

      // Track previous values for percent change
      prevPeriodMap = new Map();
      for (const companyId of companyIds) {
        const val = periodMap.get(companyId)?.get(metric);
        if (val !== undefined) {
          prevPeriodMap.set(companyId, val);
        }
      }
    }
  }

  // Build comparison table (latest values side by side)
  const tableData: Array<{
    metric: string;
    companies: Array<{
      companyId: string;
      companyName: string;
      value: number | null;
      previousValue: number | null;
      change: number | null;
    }>;
  }> = [];

  for (const metric of metricsToCompare) {
    const row: typeof tableData[number] = {
      metric,
      companies: [],
    };

    for (const companyId of companyIds) {
      const companyName = companyInfo.get(companyId)?.name ?? companyId;

      // Get the two most recent values for this company and metric
      const companyValues = values
        .filter(
          (v) =>
            v.company_id === companyId &&
            v.metric_name.toLowerCase().trim() === metric
        )
        .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

      const latestValue = companyValues[0] ? extractNumericValue(companyValues[0].value) : null;
      const previousValue = companyValues[1] ? extractNumericValue(companyValues[1].value) : null;
      const change =
        latestValue !== null && previousValue !== null
          ? calculateGrowthRate(latestValue, previousValue)
          : null;

      row.companies.push({
        companyId,
        companyName,
        value: latestValue,
        previousValue,
        change,
      });
    }

    tableData.push(row);
  }

  // Calculate portfolio average for benchmark line
  const portfolioAverage: Record<string, Array<{ period: string; value: number }>> = {};

  for (const metric of metricsToCompare) {
    portfolioAverage[metric] = [];

    for (const periodKey of sortedPeriods) {
      const periodMap = byPeriodAndCompany.get(periodKey)!;
      const values: number[] = [];

      for (const companyId of companyIds) {
        const val = periodMap.get(companyId)?.get(metric);
        if (val !== undefined) {
          values.push(val);
        }
      }

      if (values.length > 0) {
        const agg = aggregateMetricValues(values);
        portfolioAverage[metric].push({
          period: periodKey,
          value: agg.average,
        });
      }
    }
  }

  return NextResponse.json(
    {
      companies: companyIds.map((id) => ({
        id,
        name: companyInfo.get(id)?.name ?? id,
        industry: companyInfo.get(id)?.industry ?? null,
        stage: companyInfo.get(id)?.stage ?? null,
      })),
      commonMetrics,
      metricsCompared: metricsToCompare,
      chartDataByMetric,
      tableData,
      portfolioAverage,
      normalize,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

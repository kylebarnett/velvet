import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import {
  extractNumericValue,
  aggregateMetricValues,
  canSumMetric,
  formatPeriodKey,
  formatPeriodLabel,
  calculateGrowthRate,
  REVENUE_PRIORITY,
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

type CompanyInfo = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
};

// GET - Aggregated metrics across all approved portfolio companies
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const industries = url.searchParams.get("industries")?.split(",").filter(Boolean) ?? [];
  const stages = url.searchParams.get("stages")?.split(",").filter(Boolean) ?? [];
  const periodType = url.searchParams.get("periodType") ?? "monthly";
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");
  const requestedMetrics = url.searchParams.get("metrics")?.split(",").filter(Boolean) ?? [];

  // Get all approved company relationships
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

  if (relError) return jsonError(relError.message, 500);

  // Extract company info, applying filters
  const companies: CompanyInfo[] = [];
  const companyIds: string[] = [];

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as CompanyInfo | undefined)
      : (companyRaw as CompanyInfo | null);

    if (!company) continue;

    // Apply industry filter
    if (industries.length > 0 && !industries.includes(company.industry ?? "")) {
      continue;
    }

    // Apply stage filter
    if (stages.length > 0 && !stages.includes(company.stage ?? "")) {
      continue;
    }

    companies.push(company);
    companyIds.push(company.id);
  }

  if (companyIds.length === 0) {
    return NextResponse.json({
      summary: {
        totalCompanies: 0,
        approvedCompanies: 0,
        companiesWithData: 0,
      },
      aggregates: {},
      byPeriod: [],
      byCompany: [],
    });
  }

  const { limit, offset } = parsePagination(url);

  // Fetch metric values for these companies
  let query = supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value", { count: "exact" })
    .in("company_id", companyIds)
    .eq("period_type", periodType);

  if (startDate) {
    query = query.gte("period_start", startDate);
  }
  if (endDate) {
    query = query.lte("period_start", endDate);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: metricValues, error: mvError, count: metricCount } = await query;
  if (mvError) return jsonError(mvError.message, 500);

  const values = (metricValues ?? []) as MetricValue[];

  // Group by metric name for aggregates
  const metricGroups = new Map<string, number[]>();
  const companiesWithMetrics = new Set<string>();

  // Group by period for time series
  const periodGroups = new Map<
    string,
    Map<string, number[]>
  >();

  // Group by company for company breakdown
  const companyMetrics = new Map<
    string,
    Map<string, { values: number[]; latestValue: number | null; previousValue: number | null }>
  >();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const metricName = mv.metric_name.toLowerCase().trim();

    // Skip if we're filtering by specific metrics and this isn't one
    if (requestedMetrics.length > 0 && !requestedMetrics.some((m) => m.toLowerCase() === metricName)) {
      continue;
    }

    companiesWithMetrics.add(mv.company_id);

    // Aggregate by metric
    if (!metricGroups.has(metricName)) {
      metricGroups.set(metricName, []);
    }
    metricGroups.get(metricName)!.push(numValue);

    // Aggregate by period
    const periodKey = formatPeriodKey(mv.period_start, periodType);
    if (!periodGroups.has(periodKey)) {
      periodGroups.set(periodKey, new Map());
    }
    if (!periodGroups.get(periodKey)!.has(metricName)) {
      periodGroups.get(periodKey)!.set(metricName, []);
    }
    periodGroups.get(periodKey)!.get(metricName)!.push(numValue);

    // Group by company
    if (!companyMetrics.has(mv.company_id)) {
      companyMetrics.set(mv.company_id, new Map());
    }
    const companyMap = companyMetrics.get(mv.company_id)!;
    if (!companyMap.has(metricName)) {
      companyMap.set(metricName, { values: [], latestValue: null, previousValue: null });
    }
    companyMap.get(metricName)!.values.push(numValue);
  }

  // Calculate overall aggregates
  const aggregates: Record<
    string,
    {
      sum: number | null;
      average: number;
      median: number;
      min: number;
      max: number;
      count: number;
      canSum: boolean;
    }
  > = {};

  for (const [metricName, values] of metricGroups) {
    const agg = aggregateMetricValues(values);
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

  // Calculate time series by period
  const byPeriod: Array<{
    period: string;
    periodStart: string;
    label: string;
    aggregates: Record<string, { sum: number | null; average: number; count: number }>;
  }> = [];

  const sortedPeriods = [...periodGroups.keys()].sort();
  for (const periodKey of sortedPeriods) {
    const periodMetrics = periodGroups.get(periodKey)!;
    const periodAggregates: Record<string, { sum: number | null; average: number; count: number }> = {};

    for (const [metricName, values] of periodMetrics) {
      const agg = aggregateMetricValues(values);
      const isSummable = canSumMetric(metricName);
      periodAggregates[metricName] = {
        sum: isSummable ? agg.sum : null,
        average: agg.average,
        count: agg.count,
      };
    }

    byPeriod.push({
      period: periodKey,
      periodStart: periodKey,
      label: formatPeriodLabel(periodKey, periodType),
      aggregates: periodAggregates,
    });
  }

  // Calculate company breakdown with growth rates
  const byCompany: Array<{
    companyId: string;
    companyName: string;
    industry: string | null;
    stage: string | null;
    metrics: Record<string, { latest: number | null; previous: number | null; growth: number | null }>;
    revenueMetric: string | null;
    revenueGrowth: number | null;
  }> = [];

  for (const company of companies) {
    const metrics = companyMetrics.get(company.id);
    const companyData: typeof byCompany[number] = {
      companyId: company.id,
      companyName: company.name,
      industry: company.industry,
      stage: company.stage,
      metrics: {},
      revenueMetric: null,
      revenueGrowth: null,
    };

    if (metrics) {
      // Get all metric values sorted for this company
      const companyValues = values
        .filter((v) => v.company_id === company.id)
        .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());

      // Group by metric for latest/previous
      const metricLatest = new Map<string, { latest: number; previous: number | null }>();

      for (const mv of companyValues) {
        const metricName = mv.metric_name.toLowerCase().trim();
        const numValue = extractNumericValue(mv.value);
        if (numValue === null) continue;

        if (!metricLatest.has(metricName)) {
          metricLatest.set(metricName, { latest: numValue, previous: null });
        } else {
          const existing = metricLatest.get(metricName)!;
          if (existing.previous === null) {
            existing.previous = numValue;
          }
        }
      }

      for (const [metricName, data] of metricLatest) {
        const growth = data.previous !== null
          ? calculateGrowthRate(data.latest, data.previous)
          : null;
        companyData.metrics[metricName] = {
          latest: data.latest,
          previous: data.previous,
          growth,
        };
      }

      // Find primary revenue metric and its growth
      for (const revMetric of REVENUE_PRIORITY) {
        if (metricLatest.has(revMetric)) {
          const revData = metricLatest.get(revMetric)!;
          companyData.revenueMetric = revMetric;
          companyData.revenueGrowth = revData.previous !== null
            ? calculateGrowthRate(revData.latest, revData.previous)
            : null;
          break;
        }
      }
    }

    byCompany.push(companyData);
  }

  // Sort companies by revenue growth (top performers first)
  byCompany.sort((a, b) => {
    if (a.revenueGrowth === null && b.revenueGrowth === null) return 0;
    if (a.revenueGrowth === null) return 1;
    if (b.revenueGrowth === null) return -1;
    return b.revenueGrowth - a.revenueGrowth;
  });

  return NextResponse.json(
    {
      summary: {
        totalCompanies: companies.length,
        approvedCompanies: companies.length,
        companiesWithData: companiesWithMetrics.size,
      },
      aggregates,
      byPeriod,
      byCompany,
      totalMetricValues: metricCount ?? values.length,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

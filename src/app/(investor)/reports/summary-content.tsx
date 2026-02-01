import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import { ReportsClient } from "./reports-client";
import {
  extractNumericValue,
  aggregateMetricValues,
  canSumMetric,
  calculateGrowthRate,
  REVENUE_PRIORITY,
} from "@/lib/reports/aggregation";
import type { CompanyMetricBreakdown } from "@/components/reports/metric-drilldown-panel";

type SummaryContentProps = {
  industries?: string;
  stages?: string;
};

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

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "Other",
};

const STAGE_LABELS: Record<string, string> = {
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
};

// Priority KPIs that can be drilled down
const DRILLDOWN_METRICS = ["revenue", "mrr", "arr", "burn rate", "headcount", "gross margin"];

export async function SummaryContent({
  industries,
  stages,
}: SummaryContentProps) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const industryFilters = industries?.split(",").filter(Boolean) ?? [];
  const stageFilters = stages?.split(",").filter(Boolean) ?? [];

  // Get all approved company relationships with company data
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
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-200">Failed to load portfolio data.</p>
      </div>
    );
  }

  // Extract company info, applying filters
  const companies: CompanyInfo[] = [];
  const companyIds: string[] = [];

  // Count distributions
  const industryCounts = new Map<string, number>();
  const stageCounts = new Map<string, number>();

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const companyData = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string; industry: string | null; stage: string | null } | undefined)
      : (companyRaw as { id: string; name: string; industry: string | null; stage: string | null } | null);

    if (!companyData) continue;

    // Apply industry filter
    if (industryFilters.length > 0 && !industryFilters.includes(companyData.industry ?? "")) {
      continue;
    }

    // Apply stage filter
    if (stageFilters.length > 0 && !stageFilters.includes(companyData.stage ?? "")) {
      continue;
    }

    companies.push({
      id: companyData.id,
      name: companyData.name,
      industry: companyData.industry,
      stage: companyData.stage,
      logoUrl: rel.logo_url,
    });
    companyIds.push(companyData.id);

    // Count distributions
    const industry = companyData.industry ?? "unspecified";
    industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    const stage = companyData.stage ?? "unspecified";
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);
  }

  if (companyIds.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-white/60">No companies in your portfolio yet.</p>
        <a
          href="/portfolio/import"
          className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-white"
        >
          Import contacts to get started
        </a>
      </div>
    );
  }

  // Fetch metric values for these companies
  const { data: metricValues, error: mvError } = await supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds);

  if (mvError) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center">
        <p className="text-red-200">Failed to load metric data.</p>
      </div>
    );
  }

  const values = (metricValues ?? []) as MetricValue[];

  // Group by metric name for aggregates
  const metricGroups = new Map<string, number[]>();
  const companiesWithMetrics = new Set<string>();

  for (const mv of values) {
    const numValue = extractNumericValue(mv.value);
    if (numValue === null) continue;

    const metricName = mv.metric_name.toLowerCase().trim();
    companiesWithMetrics.add(mv.company_id);

    // Aggregate by metric
    if (!metricGroups.has(metricName)) {
      metricGroups.set(metricName, []);
    }
    metricGroups.get(metricName)!.push(numValue);
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

  // Build drilldown data for each tracked metric
  // Group values by company and metric, keeping only the latest value per company per metric
  const drilldownData: Record<string, CompanyMetricBreakdown[]> = {};

  for (const metric of DRILLDOWN_METRICS) {
    // Group by company, get latest value for this metric
    const companyLatestValues = new Map<
      string,
      { value: number; previous: number | null; periodStart: string }
    >();

    for (const mv of values) {
      const metricName = mv.metric_name.toLowerCase().trim();
      if (metricName !== metric) continue;

      const numValue = extractNumericValue(mv.value);
      if (numValue === null) continue;

      const existing = companyLatestValues.get(mv.company_id);
      if (!existing) {
        companyLatestValues.set(mv.company_id, {
          value: numValue,
          previous: null,
          periodStart: mv.period_start,
        });
      } else {
        // Compare dates to determine latest/previous
        const existingDate = new Date(existing.periodStart).getTime();
        const currentDate = new Date(mv.period_start).getTime();

        if (currentDate > existingDate) {
          // Current is newer, existing becomes previous
          existing.previous = existing.value;
          existing.value = numValue;
          existing.periodStart = mv.period_start;
        } else if (currentDate < existingDate && existing.previous === null) {
          // Current is older, use as previous
          existing.previous = numValue;
        }
      }
    }

    // Calculate total for percentage
    const total = Array.from(companyLatestValues.values()).reduce(
      (sum, data) => sum + data.value,
      0
    );

    // Build breakdown array
    const breakdown: CompanyMetricBreakdown[] = [];

    for (const company of companies) {
      const data = companyLatestValues.get(company.id);
      if (!data) continue;

      const growth =
        data.previous !== null
          ? calculateGrowthRate(data.value, data.previous)
          : null;

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

    // Sort by value descending
    breakdown.sort((a, b) => b.value - a.value);

    if (breakdown.length > 0) {
      drilldownData[metric] = breakdown;
    }
  }

  // Calculate company breakdown with growth rates
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

    // Find primary revenue metric and its growth
    let revenueMetric: string | null = null;
    let revenueGrowth: number | null = null;

    for (const revMetric of REVENUE_PRIORITY) {
      if (metricLatest.has(revMetric)) {
        const revData = metricLatest.get(revMetric)!;
        revenueMetric = revMetric;
        revenueGrowth = revData.previous !== null
          ? calculateGrowthRate(revData.latest, revData.previous)
          : null;
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

  // Sort companies by revenue growth (top performers first)
  byCompany.sort((a, b) => {
    if (a.revenueGrowth === null && b.revenueGrowth === null) return 0;
    if (a.revenueGrowth === null) return 1;
    if (b.revenueGrowth === null) return -1;
    return b.revenueGrowth - a.revenueGrowth;
  });

  // Format distribution data
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

  return (
    <ReportsClient
      aggregates={aggregates}
      totalCompanies={companies.length}
      companiesWithData={companiesWithMetrics.size}
      byIndustry={byIndustry}
      byStage={byStage}
      byCompany={byCompany}
      drilldownData={drilldownData}
    />
  );
}

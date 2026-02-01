import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth/require-role";
import {
  KPICards,
  DistributionCharts,
  TopPerformers,
  AggregateTrend,
} from "@/components/reports";
import {
  extractNumericValue,
  aggregateMetricValues,
  canSumMetric,
  formatPeriodKey,
  formatPeriodLabel,
  calculateGrowthRate,
  REVENUE_PRIORITY,
} from "@/lib/reports/aggregation";

type SummaryContentProps = {
  industries?: string;
  stages?: string;
  periodType?: string;
  startDate?: string;
  endDate?: string;
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
  business_model: string | null;
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

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  b2b: "B2B",
  b2c: "B2C",
  b2b2c: "B2B2C",
  marketplace: "Marketplace",
  other: "Other",
};

export async function SummaryContent({
  industries,
  stages,
  periodType = "monthly",
  startDate,
  endDate,
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
      companies (
        id,
        name,
        industry,
        stage,
        business_model
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
  const businessModelCounts = new Map<string, number>();

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as CompanyInfo | undefined)
      : (companyRaw as CompanyInfo | null);

    if (!company) continue;

    // Apply industry filter
    if (industryFilters.length > 0 && !industryFilters.includes(company.industry ?? "")) {
      continue;
    }

    // Apply stage filter
    if (stageFilters.length > 0 && !stageFilters.includes(company.stage ?? "")) {
      continue;
    }

    companies.push(company);
    companyIds.push(company.id);

    // Count distributions
    const industry = company.industry ?? "unspecified";
    industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    const stage = company.stage ?? "unspecified";
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);

    const businessModel = company.business_model ?? "unspecified";
    businessModelCounts.set(businessModel, (businessModelCounts.get(businessModel) ?? 0) + 1);
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

  // Group by period for time series
  const periodGroups = new Map<string, Map<string, number[]>>();

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

    // Aggregate by period
    const periodKey = formatPeriodKey(mv.period_start, periodType);
    if (!periodGroups.has(periodKey)) {
      periodGroups.set(periodKey, new Map());
    }
    if (!periodGroups.get(periodKey)!.has(metricName)) {
      periodGroups.get(periodKey)!.set(metricName, []);
    }
    periodGroups.get(periodKey)!.get(metricName)!.push(numValue);
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

    for (const [metricName, vals] of periodMetrics) {
      const agg = aggregateMetricValues(vals);
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

  const byBusinessModel = [...businessModelCounts.entries()]
    .map(([key, value]) => ({
      name: BUSINESS_MODEL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <KPICards
        aggregates={aggregates}
        totalCompanies={companies.length}
        companiesWithData={companiesWithMetrics.size}
      />

      {/* Distribution Charts */}
      <DistributionCharts
        byIndustry={byIndustry}
        byStage={byStage}
        byBusinessModel={byBusinessModel}
      />

      {/* Trend Chart and Top Performers */}
      <div className="grid gap-4 lg:grid-cols-2">
        <AggregateTrend byPeriod={byPeriod} />
        <TopPerformers companies={byCompany} />
      </div>
    </div>
  );
}

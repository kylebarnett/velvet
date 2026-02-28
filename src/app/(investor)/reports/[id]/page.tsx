import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/require-role";

export const metadata: Metadata = { title: "Report Editor | PostSig" };
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportEditor } from "@/components/reports/report-editor";
import type { SavedReport } from "@/components/reports/reports-context";
import {
  extractNumericValue,
  aggregateMetricValues,
  canSumMetric,
  calculateGrowthRate,
  REVENUE_PRIORITY,
} from "@/lib/reports/aggregation";
import type { CompanyMetricBreakdown } from "@/components/reports/metric-drilldown-panel";
import { INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/constants/industries";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportEditorPage({ params }: PageProps) {
  const { id } = await params;

  // Handle "new" route — shouldn't reach here but guard against it
  if (id === "new") notFound();

  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Fetch the report
  const { data: reportData, error: reportError } = await supabase
    .from("portfolio_reports")
    .select("*")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (reportError || !reportData) notFound();

  const report: SavedReport = {
    id: reportData.id,
    name: reportData.name,
    description: reportData.description,
    report_type: reportData.report_type,
    is_default: reportData.is_default,
    filters: reportData.filters,
    company_ids: reportData.company_ids,
    normalize: reportData.normalize,
    config: reportData.config,
    created_at: reportData.created_at,
    updated_at: reportData.updated_at,
  };

  const reportType = report.report_type;

  // Fetch initial data based on report type
  let summaryData = undefined;
  let comparisonData = undefined;

  if (reportType === "summary") {
    summaryData = await fetchSummaryData(supabase, user.id, report);
  }

  if (reportType === "comparison") {
    comparisonData = await fetchComparisonInitialData(supabase, user.id);
  }

  return (
    <ReportEditor
      report={report}
      summaryData={summaryData}
      comparisonData={comparisonData}
    />
  );
}

// ── Data fetching helpers ───────────────────────────────────────

type SupabaseClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

async function fetchSummaryData(
  supabase: SupabaseClient,
  userId: string,
  report: SavedReport,
) {
  const filters = (report.filters ?? {}) as Record<string, string>;

  // Get approved companies
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies (id, name, industry, stage)")
    .eq("investor_id", userId)
    .in("approval_status", ["auto_approved", "approved"]);

  if (!relationships || relationships.length === 0) {
    return {
      aggregates: {},
      totalCompanies: 0,
      companiesWithData: 0,
      byIndustry: [],
      byStage: [],
      byCompany: [],
      drilldownData: {},
      freshness: { recent: 0, aging: 0, stale: 0, noData: 0 },
      availableMetrics: [],
    };
  }

  type CompanyInfo = { id: string; name: string; industry: string | null; stage: string | null };
  const companiesMap = new Map<string, CompanyInfo>();

  for (const rel of relationships) {
    const raw = rel.companies;
    const company = Array.isArray(raw) ? raw[0] : raw;
    if (company) {
      const c = company as CompanyInfo;
      companiesMap.set(c.id, c);
    }
  }

  // Apply industry/stage filters
  let filteredIds = Array.from(companiesMap.keys());
  if (filters.industries) {
    const filterIndustries = filters.industries.split(",");
    filteredIds = filteredIds.filter((id) => {
      const company = companiesMap.get(id);
      return company?.industry && filterIndustries.includes(company.industry);
    });
  }
  if (filters.stages) {
    const filterStages = filters.stages.split(",");
    filteredIds = filteredIds.filter((id) => {
      const company = companiesMap.get(id);
      return company?.stage && filterStages.includes(company.stage);
    });
  }

  if (filteredIds.length === 0) {
    return {
      aggregates: {},
      totalCompanies: 0,
      companiesWithData: 0,
      byIndustry: [],
      byStage: [],
      byCompany: [],
      drilldownData: {},
      freshness: { recent: 0, aging: 0, stale: 0, noData: 0 },
      availableMetrics: [],
    };
  }

  // Fetch metric values
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select("id, company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", filteredIds)
    .order("period_start", { ascending: false });

  const values = metricValues ?? [];

  // Deduplicate (keep latest per company per metric)
  const latestMap = new Map<string, typeof values[0]>();
  for (const v of values) {
    const key = `${v.company_id}:${v.metric_name}`;
    if (!latestMap.has(key)) latestMap.set(key, v);
  }
  const latestValues = Array.from(latestMap.values());

  // Get companies with data
  const companiesWithDataSet = new Set(latestValues.map((v) => v.company_id));

  // Aggregate by metric
  const metricGroups = new Map<string, number[]>();
  for (const v of latestValues) {
    const num = extractNumericValue(v.value);
    if (num === null) continue;
    const group = metricGroups.get(v.metric_name) ?? [];
    group.push(num);
    metricGroups.set(v.metric_name, group);
  }

  const aggregates: Record<string, { sum: number | null; average: number; median: number; count: number; canSum: boolean }> = {};
  for (const [metric, nums] of metricGroups) {
    const agg = aggregateMetricValues(nums);
    const summable = canSumMetric(metric);
    aggregates[metric] = {
      sum: summable ? agg.sum : null,
      average: agg.average,
      median: agg.median,
      count: agg.count,
      canSum: summable,
    };
  }

  // Freshness
  const now = Date.now();
  let recent = 0, aging = 0, stale = 0, noData = 0;
  for (const companyId of filteredIds) {
    const companyValues = latestValues.filter((v) => v.company_id === companyId);
    if (companyValues.length === 0) { noData++; continue; }
    const latest = companyValues.reduce((a, b) =>
      new Date(a.period_end).getTime() > new Date(b.period_end).getTime() ? a : b
    );
    const age = now - new Date(latest.period_end).getTime();
    const days = age / (1000 * 60 * 60 * 24);
    if (days <= 45) recent++;
    else if (days <= 90) aging++;
    else stale++;
  }

  // Industry/Stage distribution
  const industryCount = new Map<string, number>();
  const stageCount = new Map<string, number>();
  for (const id of filteredIds) {
    const c = companiesMap.get(id);
    if (c?.industry) industryCount.set(c.industry, (industryCount.get(c.industry) ?? 0) + 1);
    if (c?.stage) stageCount.set(c.stage, (stageCount.get(c.stage) ?? 0) + 1);
  }

  const byIndustry = Array.from(industryCount).map(([key, value]) => ({
    key,
    name: (INDUSTRY_LABELS as Record<string, string>)[key] ?? key,
    value,
  }));
  const byStage = Array.from(stageCount).map(([key, value]) => ({
    key,
    name: (STAGE_LABELS as Record<string, string>)[key] ?? key,
    value,
  }));

  // Top performers by revenue growth
  const byCompany = filteredIds.map((companyId) => {
    const c = companiesMap.get(companyId)!;
    const companyMetrics = values.filter((v) => v.company_id === companyId);
    const revenueMetric = REVENUE_PRIORITY.find((rm) =>
      companyMetrics.some((v) => v.metric_name.toLowerCase() === rm)
    );
    let revenueGrowth: number | null = null;
    if (revenueMetric) {
      const revenueValues = companyMetrics
        .filter((v) => v.metric_name.toLowerCase() === revenueMetric)
        .sort((a, b) => new Date(b.period_start).getTime() - new Date(a.period_start).getTime());
      if (revenueValues.length >= 2) {
        const curr = extractNumericValue(revenueValues[0].value);
        const prev = extractNumericValue(revenueValues[1].value);
        if (curr !== null && prev !== null) {
          revenueGrowth = calculateGrowthRate(curr, prev);
        }
      }
    }
    return {
      companyId,
      companyName: c.name,
      industry: c.industry,
      stage: c.stage,
      revenueMetric: revenueMetric ?? null,
      revenueGrowth,
    };
  }).sort((a, b) => (b.revenueGrowth ?? -Infinity) - (a.revenueGrowth ?? -Infinity));

  // Drilldown data
  const DRILLDOWN_METRICS = ["revenue", "mrr", "arr", "burn rate", "headcount", "gross margin"];
  const drilldownData: Record<string, CompanyMetricBreakdown[]> = {};
  for (const metricKey of DRILLDOWN_METRICS) {
    const matching = latestValues.filter(
      (v) => v.metric_name.toLowerCase() === metricKey
    );
    if (matching.length === 0) continue;
    const total = matching.reduce((sum, v) => sum + (extractNumericValue(v.value) ?? 0), 0);
    drilldownData[metricKey] = matching.map((v) => {
      const c = companiesMap.get(v.company_id);
      const val = extractNumericValue(v.value) ?? 0;
      return {
        companyId: v.company_id,
        companyName: c?.name ?? "Unknown",
        logoUrl: null,
        industry: c?.industry ?? null,
        stage: c?.stage ?? null,
        value: val,
        percentOfTotal: total > 0 ? (val / total) * 100 : 0,
        growth: null,
      };
    }).sort((a, b) => b.value - a.value);
  }

  return {
    aggregates,
    totalCompanies: filteredIds.length,
    companiesWithData: companiesWithDataSet.size,
    byIndustry,
    byStage,
    byCompany,
    drilldownData,
    freshness: { recent, aging, stale, noData },
    availableMetrics: Array.from(metricGroups.keys()).sort(),
  };
}

async function fetchComparisonInitialData(supabase: SupabaseClient, userId: string) {
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies (id, name)")
    .eq("investor_id", userId)
    .in("approval_status", ["auto_approved", "approved"]);

  const companies: Array<{ id: string; name: string }> = [];
  if (relationships) {
    for (const rel of relationships) {
      const raw = rel.companies;
      const company = Array.isArray(raw) ? raw[0] : raw;
      if (company) {
        const c = company as { id: string; name: string };
        companies.push({ id: c.id, name: c.name });
      }
    }
  }
  companies.sort((a, b) => a.name.localeCompare(b.name));

  const companyIds = companies.map((c) => c.id);
  let availableMetrics: string[] = [];

  if (companyIds.length > 0) {
    const { data: metricRows } = await supabase
      .from("company_metric_values")
      .select("metric_name")
      .in("company_id", companyIds);

    if (metricRows) {
      const seen = new Map<string, string>();
      for (const row of metricRows) {
        const lower = row.metric_name.toLowerCase().trim();
        if (!seen.has(lower)) seen.set(lower, row.metric_name);
      }
      availableMetrics = Array.from(seen.values()).sort();
    }
  }

  return { companies, availableMetrics };
}

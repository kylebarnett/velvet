"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import {
  KPICards,
  DistributionCharts,
  TopPerformers,
  DataFreshnessCard,
} from "@/components/reports";
import { MetricDrilldownPanel, type CompanyMetricBreakdown } from "@/components/reports/metric-drilldown-panel";
import { useReportsContext } from "@/components/reports/reports-context";

// Labels for display
const METRIC_LABELS: Record<string, string> = {
  revenue: "Total Revenue",
  mrr: "Total MRR",
  arr: "Total ARR",
  "burn rate": "Avg Burn Rate",
  headcount: "Total Headcount",
  "gross margin": "Avg Gross Margin",
};

type DrilldownData = Record<string, CompanyMetricBreakdown[]>;

type FreshnessData = {
  recent: number;
  aging: number;
  stale: number;
  noData: number;
};

type AggregateData = Record<
  string,
  {
    sum: number | null;
    average: number;
    median: number;
    count: number;
    canSum: boolean;
  }
>;

type Props = {
  aggregates: AggregateData;
  totalCompanies: number;
  companiesWithData: number;
  byIndustry: Array<{ name: string; value: number; key: string }>;
  byStage: Array<{ name: string; value: number; key: string }>;
  byCompany: Array<{
    companyId: string;
    companyName: string;
    industry: string | null;
    stage: string | null;
    revenueMetric: string | null;
    revenueGrowth: number | null;
  }>;
  drilldownData: DrilldownData;
  freshness: FreshnessData;
};

type TimeRange = "latest" | "last_quarter" | "last_year" | "all";

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "last_year", label: "Last Year" },
  { value: "all", label: "All Time" },
];

export function ReportsClient({
  aggregates: serverAggregates,
  totalCompanies: serverTotalCompanies,
  companiesWithData: serverCompaniesWithData,
  byIndustry: serverByIndustry,
  byStage: serverByStage,
  byCompany: serverByCompany,
  drilldownData: serverDrilldownData,
  freshness: serverFreshness,
}: Props) {
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(null);
  const [timeRange, setTimeRange] = React.useState<TimeRange>("latest");
  const [loading, setLoading] = React.useState(false);

  // Client-fetched overrides when time range changes from "latest"
  const [clientData, setClientData] = React.useState<{
    aggregates: AggregateData;
    totalCompanies: number;
    companiesWithData: number;
    byIndustry: Array<{ name: string; value: number; key: string }>;
    byStage: Array<{ name: string; value: number; key: string }>;
    byCompany: Props["byCompany"];
    drilldownData: DrilldownData;
    freshness: FreshnessData;
  } | null>(null);

  const searchParams = useSearchParams();
  const { setCurrentConfig, loadedReport, clearLoadedReport } = useReportsContext();

  // Active data (client-fetched or server)
  const aggregates = clientData?.aggregates ?? serverAggregates;
  const totalCompanies = clientData?.totalCompanies ?? serverTotalCompanies;
  const companiesWithData = clientData?.companiesWithData ?? serverCompaniesWithData;
  const byIndustry = clientData?.byIndustry ?? serverByIndustry;
  const byStage = clientData?.byStage ?? serverByStage;
  const byCompany = clientData?.byCompany ?? serverByCompany;
  const drilldownData = clientData?.drilldownData ?? serverDrilldownData;
  const freshness = clientData?.freshness ?? serverFreshness;

  const industries = searchParams.get("industries") ?? undefined;
  const stages = searchParams.get("stages") ?? undefined;

  // Register current config with the reports context for save/load
  React.useEffect(() => {
    setCurrentConfig({
      reportType: "summary",
      filters: {
        ...(industries ? { industries } : {}),
        ...(stages ? { stages } : {}),
        ...(timeRange !== "latest" ? { timeRange } : {}),
      },
    });
  }, [industries, stages, timeRange, setCurrentConfig]);

  // Restore state when a saved report is loaded
  React.useEffect(() => {
    if (!loadedReport || loadedReport.report_type !== "summary") return;
    const filters = loadedReport.filters as Record<string, unknown> | undefined;
    if (filters?.timeRange && typeof filters.timeRange === "string") {
      const tr = filters.timeRange as TimeRange;
      if (TIME_RANGE_OPTIONS.some((o) => o.value === tr)) {
        setTimeRange(tr);
      }
    }
    clearLoadedReport();
  }, [loadedReport, clearLoadedReport]);

  // Fetch from API when time range is not "latest"
  React.useEffect(() => {
    if (timeRange === "latest") {
      setClientData(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    async function fetchSummary() {
      try {
        const params = new URLSearchParams({ timeRange });
        if (industries) params.set("industries", industries);
        if (stages) params.set("stages", stages);

        const res = await fetch(`/api/investors/portfolio/summary?${params}`);
        if (!res.ok) return;
        const json = await res.json();
        if (!cancelled) setClientData(json);
      } catch {
        // Keep server data on failure
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchSummary();
    return () => { cancelled = true; };
  }, [timeRange, industries, stages]);

  function handleMetricClick(metricName: string) {
    setSelectedMetric(metricName);
  }

  function handleClosePanel() {
    setSelectedMetric(null);
  }

  // Get total value for the selected metric
  const selectedTotal = React.useMemo(() => {
    if (!selectedMetric || !aggregates[selectedMetric]) return 0;
    const agg = aggregates[selectedMetric];
    return agg.canSum && agg.sum !== null ? agg.sum : agg.average;
  }, [selectedMetric, aggregates]);

  return (
    <div className="space-y-6">
      {/* Time Range Selector */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-1">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === opt.value
                  ? "bg-bg-primary text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {loading && (
          <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" />
        )}
      </div>

      {/* KPI Cards */}
      <KPICards
        aggregates={aggregates}
        totalCompanies={totalCompanies}
        companiesWithData={companiesWithData}
        onMetricClick={handleMetricClick}
      />

      {/* Distribution Charts + Top Performers + Freshness */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="h-full">
          <DistributionCharts
            byIndustry={byIndustry}
            byStage={byStage}
          />
        </div>
        <div className="h-full">
          <TopPerformers companies={byCompany} />
        </div>
        <div className="h-full">
          <DataFreshnessCard freshness={freshness} />
        </div>
      </div>

      {/* Drilldown Panel */}
      {selectedMetric && drilldownData[selectedMetric] && (
        <MetricDrilldownPanel
          metricName={selectedMetric}
          metricLabel={METRIC_LABELS[selectedMetric] ?? selectedMetric}
          total={selectedTotal}
          companies={drilldownData[selectedMetric]}
          onClose={handleClosePanel}
        />
      )}
    </div>
  );
}

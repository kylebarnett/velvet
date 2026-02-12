"use client";

import { useCallback, useEffect, useState } from "react";
import { TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useReportsContext } from "@/components/reports/reports-context";
import { GrowthDistributionChart } from "./growth-distribution-chart";
import { YoYComparisonChart } from "./yoy-comparison-chart";
import { OutlierTable } from "./outlier-table";

type GrowthBucket = {
  bucket: string;
  count: number;
};

type YoYDataPoint = {
  period: string;
  label: string;
  currentYear: number | null;
  priorYear: number | null;
};

type Outlier = {
  companyId: string;
  companyName: string;
  growth: number;
  direction: "outperforming" | "underperforming";
};

type TrendsData = {
  metric: string;
  periodType: string;
  periods: number;
  companyCount: number;
  companiesWithGrowth: number;
  growthDistribution: GrowthBucket[];
  yoyData: YoYDataPoint[];
  outliers: Outlier[];
  currentYear: number;
  priorYear: number;
};

type TrendsClientProps = {
  availableMetrics: string[];
};

const NONE = "__none__";

const INDUSTRIES = [
  { value: "", label: "All Industries" },
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "edtech", label: "EdTech" },
  { value: "ai_ml", label: "AI/ML" },
  { value: "other", label: "Other" },
];

const STAGES = [
  { value: "", label: "All Stages" },
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth", label: "Growth" },
];

export function TrendsClient({ availableMetrics }: TrendsClientProps) {
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics.length > 0 ? availableMetrics[0] : ""
  );
  const [periodType, setPeriodType] = useState("quarterly");
  const [periods, setPeriods] = useState("8");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save/load context integration
  const { setCurrentConfig, loadedReport, clearLoadedReport } = useReportsContext();

  // Register current config with context
  useEffect(() => {
    if (selectedMetric) {
      setCurrentConfig({
        reportType: "trends",
        filters: {
          metric: selectedMetric,
          periodType,
          periods,
          ...(industry ? { industry } : {}),
          ...(stage ? { stage } : {}),
        },
      });
    }
  }, [selectedMetric, periodType, periods, industry, stage, setCurrentConfig]);

  // Restore state when a saved report is loaded
  useEffect(() => {
    if (!loadedReport || loadedReport.report_type !== "trends") return;

    const filters = loadedReport.filters as Record<string, unknown> | undefined;
    if (filters?.metric && typeof filters.metric === "string") {
      setSelectedMetric(filters.metric);
    }
    if (filters?.periodType && typeof filters.periodType === "string") {
      setPeriodType(filters.periodType);
    }
    if (filters?.periods && typeof filters.periods === "string") {
      setPeriods(filters.periods);
    }
    if (filters?.industry && typeof filters.industry === "string") {
      setIndustry(filters.industry);
    }
    if (filters?.stage && typeof filters.stage === "string") {
      setStage(filters.stage);
    }

    clearLoadedReport();
  }, [loadedReport, clearLoadedReport]);

  const fetchTrends = useCallback(async () => {
    if (!selectedMetric) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        metric: selectedMetric,
        periodType,
        periods,
      });
      if (industry) params.set("industry", industry);
      if (stage) params.set("stage", stage);

      const res = await fetch(`/api/investors/portfolio/trends?${params}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to load trends data.");
      }

      const json = await res.json();
      setData(json);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, periodType, periods, industry, stage]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (availableMetrics.length === 0) {
    return (
      <div className="card-surface rounded-xl border border-border-subtle p-12 text-center">
        <TrendingUp className="mx-auto mb-3 h-10 w-10 text-text-muted" />
        <p className="text-text-secondary">No metric data available yet</p>
        <p className="mt-1 text-sm text-text-muted">
          Trends will appear here once founders submit metric data
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-full sm:w-56">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Metric
            </label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger>
                <SelectValue placeholder="Select metric" />
              </SelectTrigger>
              <SelectContent>
                {availableMetrics.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Period Type
            </label>
            <Select value={periodType} onValueChange={setPeriodType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-32">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Periods
            </label>
            <Select value={periods} onValueChange={setPeriods}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="4">4</SelectItem>
                <SelectItem value="8">8</SelectItem>
                <SelectItem value="12">12</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Industry
            </label>
            <Select
              value={industry || NONE}
              onValueChange={(v) => setIndustry(v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INDUSTRIES.map((opt) => (
                  <SelectItem key={opt.value || NONE} value={opt.value || NONE}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-40">
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-text-muted">
              Stage
            </label>
            <Select
              value={stage || NONE}
              onValueChange={(v) => setStage(v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGES.map((opt) => (
                  <SelectItem key={opt.value || NONE} value={opt.value || NONE}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
            <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-hover" />
            <div className="h-64 animate-pulse rounded-xl bg-bg-raised" />
          </div>
          <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
            <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-hover" />
            <div className="h-64 animate-pulse rounded-xl bg-bg-raised" />
          </div>
          <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-bg-hover" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-raised" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Summary stat */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-text-tertiary">
            <span>
              Analyzing <span className="font-medium text-text-primary">{data.companyCount}</span>{" "}
              {data.companyCount === 1 ? "company" : "companies"}
            </span>
            <span className="hidden text-text-faint sm:inline">|</span>
            <span>
              <span className="font-medium text-text-primary">{data.companiesWithGrowth}</span> with
              growth data
            </span>
          </div>

          {/* Growth Distribution */}
          <GrowthDistributionChart
            data={data.growthDistribution}
            metricName={data.metric}
            companyCount={data.companiesWithGrowth}
          />

          {/* YoY Comparison */}
          <YoYComparisonChart
            data={data.yoyData}
            metricName={data.metric}
            currentYear={data.currentYear}
            priorYear={data.priorYear}
          />

          {/* Outliers */}
          <OutlierTable
            outliers={data.outliers}
            metricName={data.metric}
          />
        </div>
      )}
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

export function TrendsClient({ availableMetrics }: TrendsClientProps) {
  const [selectedMetric, setSelectedMetric] = useState(
    availableMetrics.length > 0 ? availableMetrics[0] : ""
  );
  const [periodType, setPeriodType] = useState("quarterly");
  const [periods, setPeriods] = useState("8");
  const [data, setData] = useState<TrendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  }, [selectedMetric, periodType, periods]);

  useEffect(() => {
    fetchTrends();
  }, [fetchTrends]);

  if (availableMetrics.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.08]">
            <svg
              className="h-6 w-6 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
          </div>
          <p className="text-white/60">No metric data available yet</p>
          <p className="mt-1 text-sm text-white/40">
            Trends will appear here once founders submit metric data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-full sm:w-56">
          <label className="mb-1.5 block text-xs font-medium text-white/60">
            Metric
          </label>
          <Select value={selectedMetric} onValueChange={setSelectedMetric}>
            <SelectTrigger size="sm">
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
          <label className="mb-1.5 block text-xs font-medium text-white/60">
            Period Type
          </label>
          <Select value={periodType} onValueChange={setPeriodType}>
            <SelectTrigger size="sm">
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
          <label className="mb-1.5 block text-xs font-medium text-white/60">
            Periods
          </label>
          <Select value={periods} onValueChange={setPeriods}>
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="4">4</SelectItem>
              <SelectItem value="8">8</SelectItem>
              <SelectItem value="12">12</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
        >
          {error}
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
            <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
            <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />
          </div>
          <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
            <div className="mb-4 h-5 w-32 animate-pulse rounded bg-white/10" />
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Data */}
      {!loading && data && (
        <div className="space-y-6">
          {/* Summary stat */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-white/60">
            <span>
              Analyzing <span className="font-medium text-white">{data.companyCount}</span>{" "}
              {data.companyCount === 1 ? "company" : "companies"}
            </span>
            <span className="hidden text-white/20 sm:inline">|</span>
            <span>
              <span className="font-medium text-white">{data.companiesWithGrowth}</span> with
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

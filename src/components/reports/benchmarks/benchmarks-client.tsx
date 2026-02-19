"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import { Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { getPercentileBgColor } from "@/lib/benchmarks/calculate";
import { findDefaultMetric } from "@/lib/reports/constants";
import { formatValue } from "@/components/charts/types";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { useReportsContext } from "@/components/reports/reports-context";

const BenchmarkChart = dynamic(
  () => import("./benchmark-chart").then(m => ({ default: m.BenchmarkChart })),
  { ssr: false, loading: () => <div className="h-80 animate-pulse rounded-xl bg-white/5" /> }
);
import { BenchmarkTable } from "./benchmark-table";
import { BenchmarkPortfolioSummary } from "./benchmark-portfolio-summary";

const NONE = "__none__";

type CompanyBenchmark = {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  percentile: number | null;
  industry: string | null;
  stage: string | null;
};

type BenchmarkData = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
  calculated_at: string;
} | null;

type BenchmarkResponse = {
  benchmark: BenchmarkData;
  companies: CompanyBenchmark[];
};

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

export function BenchmarksClient() {
  const [metricNames, setMetricNames] = useState<string[]>([]);
  const [selectedMetric, setSelectedMetric] = useState("");
  const [industry, setIndustry] = useState("");
  const [stage, setStage] = useState("");
  const [isLoadingMetrics, setIsLoadingMetrics] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<BenchmarkData>(null);
  const [companies, setCompanies] = useState<CompanyBenchmark[]>([]);

  const abortRef = useRef<AbortController | null>(null);

  // Save/load context integration
  const { setCurrentConfig, loadedReport, clearLoadedReport } = useReportsContext();

  // Register current config with context
  useEffect(() => {
    if (selectedMetric) {
      setCurrentConfig({
        reportType: "benchmarks",
        filters: { metric: selectedMetric, industry, stage },
      });
    }
  }, [selectedMetric, industry, stage, setCurrentConfig]);

  // Restore state when a saved report is loaded
  useEffect(() => {
    if (!loadedReport || loadedReport.report_type !== "benchmarks") return;

    const filters = loadedReport.filters as Record<string, unknown> | undefined;
    if (filters?.metric && typeof filters.metric === "string") {
      setSelectedMetric(filters.metric);
    }
    if (filters?.industry && typeof filters.industry === "string") {
      setIndustry(filters.industry);
    }
    if (filters?.stage && typeof filters.stage === "string") {
      setStage(filters.stage);
    }

    clearLoadedReport();
  }, [loadedReport, clearLoadedReport]);

  // Fetch available metric names
  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      try {
        const res = await fetch("/api/investors/portfolio/metric-names");
        if (!res.ok) throw new Error("Failed to load metrics");
        const data = await res.json();
        if (!cancelled) {
          const names: string[] = data.metricNames ?? [];
          setMetricNames(names);
          // Auto-select a default metric (functional updater so saved-report restore isn't overwritten)
          if (names.length > 0) {
            setSelectedMetric((prev) => prev || findDefaultMetric(names));
          }
        }
      } catch {
        if (!cancelled) setError("Failed to load available metrics.");
      } finally {
        if (!cancelled) setIsLoadingMetrics(false);
      }
    }

    loadMetrics();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch benchmark data when metric/filters change
  const fetchBenchmarks = useCallback(async () => {
    if (!selectedMetric) {
      setBenchmarkData(null);
      setCompanies([]);
      return;
    }

    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoadingData(true);
    setError(null);

    try {
      const params = new URLSearchParams({ metric: selectedMetric });
      if (industry) params.set("industry", industry);
      if (stage) params.set("stage", stage);

      const res = await fetch(`/api/investors/benchmarks?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data: BenchmarkResponse = await res.json();
      if (!controller.signal.aborted) {
        setBenchmarkData(data.benchmark);
        setCompanies(data.companies);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      if (!controller.signal.aborted) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load benchmark data.",
        );
      }
    } finally {
      if (!controller.signal.aborted) setIsLoadingData(false);
    }
  }, [selectedMetric, industry, stage]);

  useEffect(() => {
    fetchBenchmarks();
  }, [fetchBenchmarks]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const hasBenchmark = benchmarkData !== null;
  const hasCompanies = companies.length > 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Metric selector */}
          <div>
            <label id="benchmarks-metric-label" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Metric
            </label>
            {isLoadingMetrics ? (
              <div className="h-11 animate-pulse rounded-md bg-bg-elevated" />
            ) : (
              <Select
                value={selectedMetric}
                onValueChange={setSelectedMetric}
              >
                <SelectTrigger aria-labelledby="benchmarks-metric-label">
                  <SelectValue placeholder="Select a metric..." />
                </SelectTrigger>
                <SelectContent>
                  {metricNames.map((name) => (
                    <SelectItem key={name} value={name}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Industry filter */}
          <div>
            <label id="benchmarks-industry-label" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Industry
            </label>
            <Select
              value={industry || NONE}
              onValueChange={(v) => setIndustry(v === NONE ? "" : v)}
            >
              <SelectTrigger aria-labelledby="benchmarks-industry-label">
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

          {/* Stage filter */}
          <div>
            <label id="benchmarks-stage-label" className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-text-muted">
              Stage
            </label>
            <Select
              value={stage || NONE}
              onValueChange={(v) => setStage(v === NONE ? "" : v)}
            >
              <SelectTrigger aria-labelledby="benchmarks-stage-label">
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

      {/* Error */}
      {error && (
        <div
          className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoadingData && (
        <div className="flex items-center justify-center gap-2 py-12 text-text-muted">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading benchmark data...</span>
        </div>
      )}

      {/* Benchmark percentile band summary */}
      {!isLoadingData && hasBenchmark && (
        <div className="grid gap-4 sm:grid-cols-4">
          {(
            [
              { label: "25th", key: "p25" as const },
              { label: "50th (Median)", key: "p50" as const },
              { label: "75th", key: "p75" as const },
              { label: "90th", key: "p90" as const },
            ] as const
          ).map(({ label, key }) => (
            <div
              key={key}
              className="rounded-xl border border-border-default card-surface p-4"
            >
              <div className="text-xs font-medium text-text-muted">{label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
                {formatValue(benchmarkData![key], selectedMetric)}
              </div>
              <div className="mt-0.5 text-[10px] text-text-faint">
                {benchmarkData!.sample_size} companies
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Portfolio Summary */}
      {!isLoadingData && hasBenchmark && hasCompanies && (
        <BenchmarkPortfolioSummary
          companies={companies}
          benchmark={benchmarkData!}
        />
      )}

      {/* Chart */}
      {!isLoadingData && hasBenchmark && hasCompanies && (
        <BenchmarkChart
          companies={companies}
          benchmark={benchmarkData!}
          metricName={selectedMetric}
        />
      )}

      {/* Table */}
      {!isLoadingData && hasCompanies && (
        <BenchmarkTable
          companies={companies}
          medianValue={benchmarkData?.p50 ?? null}
          metricName={selectedMetric}
        />
      )}

      {/* No benchmark data state */}
      {!isLoadingData &&
        !error &&
        selectedMetric &&
        !hasBenchmark &&
        hasCompanies && (
          <div className="rounded-xl border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] p-4 text-sm text-[var(--status-warning-text)]">
            Currently {companies.length} {companies.length === 1 ? "company has" : "companies have"} data for this metric. Benchmarks require at least 5 companies and are calculated daily.
          </div>
        )}

      {/* No companies data state */}
      {!isLoadingData &&
        !error &&
        selectedMetric &&
        !hasCompanies &&
        !isLoadingData && (
          <div className="py-12 text-center">
            <p className="text-sm text-text-secondary">
              None of your portfolio companies have submitted data for this metric.
            </p>
          </div>
        )}

      {/* Initial empty state — only when no metrics exist at all */}
      {!selectedMetric && !isLoadingMetrics && !isLoadingData && !error && (
        <div className="py-12 text-center">
          <p className="text-sm text-text-muted">
            {metricNames.length === 0
              ? "No metrics available yet. Benchmarks will appear once your portfolio companies submit data."
              : "Select a metric above to see how your portfolio companies compare to industry benchmarks."}
          </p>
        </div>
      )}
    </div>
  );
}

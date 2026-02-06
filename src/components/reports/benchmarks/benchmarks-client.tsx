"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Loader2, BarChart3 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { getPercentileBgColor } from "@/lib/benchmarks/calculate";
import { BenchmarkChart } from "./benchmark-chart";
import { BenchmarkTable } from "./benchmark-table";

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

  // Fetch available metric names
  useEffect(() => {
    let cancelled = false;

    async function loadMetrics() {
      try {
        const res = await fetch("/api/investors/portfolio/metric-names");
        if (!res.ok) throw new Error("Failed to load metrics");
        const data = await res.json();
        if (!cancelled) {
          setMetricNames(data.metricNames ?? []);
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
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-50">
          Portfolio Benchmarks
        </h2>
        <p className="mt-1 text-sm text-white/60">
          See how your portfolio companies rank against anonymized industry
          benchmarks.
        </p>
      </div>

      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {/* Metric selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Metric
            </label>
            {isLoadingMetrics ? (
              <div className="h-11 animate-pulse rounded-md bg-white/[0.06]" />
            ) : (
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
              >
                <option value="">Select a metric...</option>
                {metricNames.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Industry filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Industry
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
            >
              {INDUSTRIES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Stage filter */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Stage
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
            >
              {STAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoadingData && (
        <div className="flex items-center justify-center gap-2 py-12 text-white/50">
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
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="text-xs font-medium text-white/40">{label}</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-zinc-50">
                {benchmarkData![key].toLocaleString("en-US", {
                  maximumFractionDigits: 2,
                })}
              </div>
              <div className="mt-0.5 text-[10px] text-white/30">
                {benchmarkData!.sample_size} companies
              </div>
            </div>
          ))}
        </div>
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
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-200">
            No benchmark data available for this metric yet. Benchmarks are
            calculated daily when at least 5 companies have submitted data.
          </div>
        )}

      {/* No companies data state */}
      {!isLoadingData &&
        !error &&
        selectedMetric &&
        !hasCompanies &&
        !isLoadingData && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="text-white/60">
              None of your portfolio companies have submitted data for this
              metric.
            </p>
          </div>
        )}

      {/* Initial empty state */}
      {!selectedMetric && !isLoadingData && !error && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-white/20" />
          <p className="text-white/50">
            Select a metric above to see how your portfolio companies compare to
            industry benchmarks.
          </p>
        </div>
      )}
    </div>
  );
}

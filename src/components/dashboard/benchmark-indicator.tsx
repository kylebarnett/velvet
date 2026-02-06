"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils/cn";
import {
  getCompanyPercentile,
  getPercentileBgColor,
  type PercentileResult,
} from "@/lib/benchmarks/calculate";

type BenchmarkIndicatorProps = {
  value: number;
  metricName: string;
  industry?: string;
  stage?: string;
  /** If true, show just the colored badge without tooltip wrapper */
  compact?: boolean;
};

type CachedBenchmark = {
  benchmark: PercentileResult | null;
  fetchedAt: number;
};

// Simple in-memory cache to avoid redundant fetches for the same metric
const benchmarkCache = new Map<string, CachedBenchmark>();
const CACHE_TTL_MS = 60_000; // 1 minute

function getCacheKey(
  metricName: string,
  industry?: string,
  stage?: string,
): string {
  return `${metricName.toLowerCase()}|${industry ?? ""}|${stage ?? ""}`;
}

export function BenchmarkIndicator({
  value,
  metricName,
  industry,
  stage,
  compact = false,
}: BenchmarkIndicatorProps) {
  const [benchmark, setBenchmark] = useState<PercentileResult | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cacheKey = getCacheKey(metricName, industry, stage);
    const cached = benchmarkCache.get(cacheKey);

    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      setBenchmark(cached.benchmark);
      setLoaded(true);
      return;
    }

    let cancelled = false;

    async function fetchBenchmark() {
      try {
        const params = new URLSearchParams({ metric: metricName });
        if (industry) params.set("industry", industry);
        if (stage) params.set("stage", stage);

        const res = await fetch(`/api/investors/benchmarks?${params}`);
        if (!res.ok) return;

        const data = await res.json();
        if (!cancelled) {
          const bm = data.benchmark as PercentileResult | null;
          setBenchmark(bm);
          benchmarkCache.set(cacheKey, {
            benchmark: bm,
            fetchedAt: Date.now(),
          });
          setLoaded(true);
        }
      } catch {
        if (!cancelled) setLoaded(true);
      }
    }

    fetchBenchmark();
    return () => {
      cancelled = true;
    };
  }, [metricName, industry, stage]);

  if (!loaded || !benchmark) return null;

  const percentile = getCompanyPercentile(value, benchmark);
  const bgColor = getPercentileBgColor(percentile);

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
        bgColor,
      )}
    >
      P{percentile}
    </span>
  );

  if (compact) return badge;

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {badge}
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white/80 shadow-xl"
        >
          <span className="font-medium">{percentile}th percentile</span>
          <span className="text-white/50">
            {" "}
            (above {percentile}% of companies)
          </span>
          <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-white/10 bg-zinc-900" />
        </div>
      )}
    </span>
  );
}

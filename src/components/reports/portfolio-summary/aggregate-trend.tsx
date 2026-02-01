"use client";

import { AreaChart } from "@/components/charts/area-chart";

type PeriodAggregate = {
  period: string;
  label: string;
  aggregates: Record<string, { sum: number | null; average: number; count: number }>;
};

type AggregateTrendProps = {
  byPeriod: PeriodAggregate[];
  metric?: string;
};

// Priority metrics for trend display
const TREND_METRICS = ["mrr", "arr", "revenue", "net revenue", "gmv"];

export function AggregateTrend({ byPeriod, metric }: AggregateTrendProps) {
  if (byPeriod.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08]">
              <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Portfolio Trend</h3>
              <p className="text-xs text-white/40">over time</p>
            </div>
          </div>
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-sm text-white/40">No trend data available yet</p>
          </div>
        </div>
      </div>
    );
  }

  // Find the best metric to display
  let selectedMetric = metric;
  if (!selectedMetric) {
    // Check which priority metrics have data
    for (const m of TREND_METRICS) {
      if (byPeriod.some((p) => p.aggregates[m]?.sum !== null || p.aggregates[m]?.average !== undefined)) {
        selectedMetric = m;
        break;
      }
    }
  }

  // If no priority metric found, use first available
  if (!selectedMetric && byPeriod[0]) {
    const availableMetrics = Object.keys(byPeriod[0].aggregates);
    selectedMetric = availableMetrics[0];
  }

  if (!selectedMetric) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ring-white/[0.08]">
              <svg className="h-5 w-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Portfolio Trend</h3>
              <p className="text-xs text-white/40">over time</p>
            </div>
          </div>
          <div className="flex h-[180px] items-center justify-center">
            <p className="text-sm text-white/40">No trend data available yet</p>
          </div>
        </div>
      </div>
    );
  }

  // Transform data for chart
  const chartData = byPeriod.map((period) => {
    const metricData = period.aggregates[selectedMetric!];
    // Use sum for summable metrics, average otherwise
    const value = metricData?.sum ?? metricData?.average ?? null;
    return {
      period: period.label,
      periodStart: period.period,
      periodEnd: period.period,
      [selectedMetric!]: value,
    };
  });

  // Calculate trend
  const firstValue = chartData[0]?.[selectedMetric!] as number | null;
  const lastValue = chartData[chartData.length - 1]?.[selectedMetric!] as number | null;
  const trendPercent =
    firstValue && lastValue && firstValue !== 0
      ? ((lastValue - firstValue) / Math.abs(firstValue)) * 100
      : null;

  const metricLabel = selectedMetric.charAt(0).toUpperCase() + selectedMetric.slice(1);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
              <svg className="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-white">Portfolio {metricLabel}</h3>
              <p className="text-xs text-white/40">over time</p>
            </div>
          </div>

          {/* Trend indicator */}
          {trendPercent !== null && (
            <div
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                trendPercent >= 0
                  ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
                  : "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
              }`}
            >
              <svg
                className={`h-3.5 w-3.5 ${trendPercent >= 0 ? "" : "rotate-180"}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {trendPercent >= 0 ? "+" : ""}
              {trendPercent.toFixed(1)}%
            </div>
          )}
        </div>

        {/* Chart */}
        <AreaChart
          data={chartData}
          metrics={[selectedMetric]}
          height={200}
          showLegend={false}
        />
      </div>
    </div>
  );
}

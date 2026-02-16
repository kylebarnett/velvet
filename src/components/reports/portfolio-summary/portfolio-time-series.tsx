"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Loader2, TrendingUp } from "lucide-react";

import { useChartTheme } from "@/hooks/use-chart-theme";
import { formatValue, formatCompactValue } from "@/components/charts/types";
import { findDefaultMetric } from "@/lib/reports/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type DataPoint = {
  period: string;
  label: string;
  value: number;
  companyCount: number;
};

type TimeSeriesData = {
  metric: string;
  periodType: string;
  dataPoints: DataPoint[];
};

type PortfolioTimeSeriesProps = {
  availableMetrics: string[];
  industries?: string;
  stages?: string;
};

export function PortfolioTimeSeries({
  availableMetrics,
  industries,
  stages,
}: PortfolioTimeSeriesProps) {
  const chartTheme = useChartTheme();

  const defaultMetric = findDefaultMetric(availableMetrics);

  const [selectedMetric, setSelectedMetric] = useState(defaultMetric);
  const [data, setData] = useState<TimeSeriesData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchTimeSeries = useCallback(async () => {
    if (!selectedMetric) return;
    setLoading(true);

    try {
      const params = new URLSearchParams({
        metric: selectedMetric,
        periodType: "quarterly",
        periods: "8",
      });
      if (industries) params.set("industries", industries);
      if (stages) params.set("stages", stages);

      const res = await fetch(`/api/investors/portfolio/summary/time-series?${params}`);
      if (!res.ok) return;
      const json: TimeSeriesData = await res.json();
      setData(json);
    } catch {
      // Silently fail — chart is supplementary
    } finally {
      setLoading(false);
    }
  }, [selectedMetric, industries, stages]);

  useEffect(() => {
    fetchTimeSeries();
  }, [fetchTimeSeries]);

  if (availableMetrics.length === 0) return null;

  const accentColor = "var(--kpi-emerald-accent, #34d399)";
  const accentBg = "var(--kpi-emerald-bg, rgba(52,211,153,0.1))";

  return (
    <div className="card-surface rounded-2xl border border-border-subtle p-5">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
        <h3 className="text-sm font-semibold text-text-primary">Portfolio Trend</h3>
        <span className="text-sm text-text-muted" aria-hidden="true">&middot;</span>
        <Select value={selectedMetric} onValueChange={setSelectedMetric}>
          <SelectTrigger className="h-auto w-auto gap-1 border-none bg-transparent px-1 py-0.5 text-sm font-semibold text-text-primary shadow-none hover:bg-bg-elevated rounded-md transition-colors">
            <SelectValue />
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

      {/* Chart */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-text-muted" />
        </div>
      ) : !data || data.dataPoints.length === 0 ? (
        <div className="flex h-64 items-center justify-center text-sm text-text-muted">
          No trend data available for this metric
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data.dataPoints} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id="portfolioTrendGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={accentColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={accentColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={chartTheme.grid}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: chartTheme.tick, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) => formatCompactValue(v, selectedMetric)}
              width={85}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const point = payload[0].payload as DataPoint;
                return (
                  <div
                    className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                    style={{
                      backgroundColor: chartTheme.tooltipBg,
                      borderColor: chartTheme.tooltipBorder,
                      color: chartTheme.tooltipText,
                    }}
                  >
                    <div className="font-medium" style={{ color: chartTheme.tooltipLabel }}>{label}</div>
                    <div className="mt-1 text-sm font-semibold">
                      {formatValue(point.value, selectedMetric)}
                    </div>
                    <div className="mt-0.5" style={{ color: chartTheme.tooltipLabel }}>
                      {point.companyCount} {point.companyCount === 1 ? "company" : "companies"}
                    </div>
                  </div>
                );
              }}
              cursor={{ stroke: chartTheme.cursor }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={accentColor}
              strokeWidth={2}
              fill="url(#portfolioTrendGradient)"
              dot={false}
              activeDot={{
                r: 4,
                fill: accentColor,
                stroke: accentBg,
                strokeWidth: 2,
              }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useChartTheme } from "@/hooks/use-chart-theme";
import { formatValue, formatCompactValue, formatPeriod } from "@/components/charts/types";
import { formatMetricDisplayName } from "@/lib/metric-definitions";

type TimeSeriesPoint = {
  periodStart: string;
  periodEnd: string;
  value: number;
};

type CompanyMetricTrendsProps = {
  timeSeries: Record<string, TimeSeriesPoint[]>;
  periodType?: string;
};

export function CompanyMetricTrends({
  timeSeries,
  periodType = "monthly",
}: CompanyMetricTrendsProps) {
  const chartTheme = useChartTheme();
  const metricNames = Object.keys(timeSeries).filter(
    (name) => timeSeries[name].length >= 2
  );

  if (metricNames.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        Not enough data points for trend charts (need at least 2 periods).
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {metricNames.map((metricName) => {
        const data = timeSeries[metricName].map((point) => ({
          ...point,
          label: formatPeriod(point.periodStart, periodType),
        }));

        return (
          <div
            key={metricName}
            className="rounded-lg border border-border-subtle bg-bg-elevated p-3"
          >
            <h4 className="mb-2 text-xs font-medium text-text-secondary">
              {formatMetricDisplayName(metricName)}
            </h4>
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                <defs>
                  <linearGradient id={`grad-${metricName.replace(/\s+/g, "-")}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={chartTheme.grid}
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  tick={{ fill: chartTheme.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: chartTheme.tick, fontSize: 10 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCompactValue(v, metricName)}
                  width={75}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const val = payload[0].value as number;
                    return (
                      <div
                        className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                        style={{
                          backgroundColor: chartTheme.tooltipBg,
                          borderColor: chartTheme.tooltipBorder,
                          color: chartTheme.tooltipText,
                        }}
                      >
                        <div className="font-medium" style={{ color: chartTheme.tooltipLabel }}>
                          {label}
                        </div>
                        <div className="mt-1 text-sm font-semibold">
                          {formatValue(val, metricName)}
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill={`url(#grad-${metricName.replace(/\s+/g, "-")})`}
                  dot={false}
                  activeDot={{ r: 3, fill: "#3b82f6" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        );
      })}
    </div>
  );
}

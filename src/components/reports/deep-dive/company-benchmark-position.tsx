"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";

import { useChartTheme } from "@/hooks/use-chart-theme";
import { formatCompactValue } from "@/components/charts/types";

type BenchmarkPosition = {
  metricName: string;
  value: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  percentile: number | null;
};

type CompanyBenchmarkPositionProps = {
  positions: BenchmarkPosition[];
  companyName: string;
};

function getPercentileColor(percentile: number | null): string {
  if (percentile === null) return "#71717a";
  if (percentile < 25) return "#f87171";
  if (percentile < 50) return "#fbbf24";
  if (percentile < 75) return "#60a5fa";
  return "#34d399";
}

function getPercentileLabel(percentile: number | null): string {
  if (percentile === null) return "N/A";
  return `${percentile}th`;
}

export function CompanyBenchmarkPosition({
  positions,
  companyName,
}: CompanyBenchmarkPositionProps) {
  const chartTheme = useChartTheme();

  if (positions.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        No benchmark data available for this company&apos;s metrics.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Percentile summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {positions.map((pos) => (
          <div
            key={pos.metricName}
            className="flex items-center justify-between rounded-lg border border-border-subtle bg-bg-elevated p-3"
          >
            <div>
              <div className="text-xs font-medium text-text-muted">{pos.metricName}</div>
              <div className="mt-0.5 text-sm font-semibold tabular-nums text-text-primary">
                {formatCompactValue(pos.value, pos.metricName)}
              </div>
            </div>
            <div
              className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold"
              style={{
                backgroundColor: `${getPercentileColor(pos.percentile)}20`,
                color: getPercentileColor(pos.percentile),
              }}
            >
              {getPercentileLabel(pos.percentile)}
            </div>
          </div>
        ))}
      </div>

      {/* Bar chart showing company value vs benchmark bands */}
      {positions.length > 0 && (
        <div className="rounded-lg border border-border-subtle bg-bg-elevated p-4">
          <h4 className="mb-3 text-xs font-medium text-text-secondary">
            {companyName} vs Industry Benchmarks
          </h4>
          <ResponsiveContainer width="100%" height={Math.max(200, positions.length * 50)}>
            <BarChart
              data={positions.map((p) => ({
                name: p.metricName.length > 14 ? p.metricName.slice(0, 12) + "..." : p.metricName,
                fullName: p.metricName,
                value: p.value,
                percentile: p.percentile,
                p50: p.p50,
              }))}
              layout="vertical"
              margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.grid}
                horizontal={false}
              />
              <XAxis
                type="number"
                tick={{ fill: chartTheme.tick, fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: chartTheme.tick, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={100}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const data = payload[0].payload;
                  return (
                    <div
                      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
                      style={{
                        backgroundColor: chartTheme.tooltipBg,
                        borderColor: chartTheme.tooltipBorder,
                        color: chartTheme.tooltipText,
                      }}
                    >
                      <div className="font-medium">{data.fullName}</div>
                      <div className="mt-1">
                        Value: {formatCompactValue(data.value, data.fullName)}
                      </div>
                      <div>Median: {formatCompactValue(data.p50, data.fullName)}</div>
                      {data.percentile !== null && (
                        <div>{data.percentile}th percentile</div>
                      )}
                    </div>
                  );
                }}
              />
              <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={24}>
                {positions.map((pos, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getPercentileColor(pos.percentile)}
                    fillOpacity={0.8}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { useChartTheme } from "@/hooks/use-chart-theme";

type GrowthBucket = {
  bucket: string;
  count: number;
};

type GrowthDistributionChartProps = {
  data: GrowthBucket[];
  metricName: string;
  companyCount: number;
};

const BUCKET_COLORS: Record<string, string> = {
  "<-20%": "#ef4444",       // red-500
  "-20% to -10%": "#f87171", // red-400
  "-10% to 0%": "#fca5a5",  // red-300
  "0% to 10%": "#6ee7b7",   // emerald-300
  "10% to 20%": "#34d399",  // emerald-400
  ">20%": "#10b981",        // emerald-500
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-border-default bg-bg-secondary px-3 py-2 shadow-xl">
      <p className="text-xs text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">
        {payload[0].value} {payload[0].value === 1 ? "company" : "companies"}
      </p>
    </div>
  );
}

export function GrowthDistributionChart({
  data,
  metricName,
  companyCount,
}: GrowthDistributionChartProps) {
  const chartTheme = useChartTheme();
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent transition-all duration-300 hover:border-border-default">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[var(--warning-bg-subtle)] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--status-warning-bg)] to-[var(--warning-bg-subtle)] ring-1 ring-[var(--warning-border)] text-[var(--warning-accent)]">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Growth Distribution</h3>
            <p className="text-xs text-text-muted">
              {metricName} growth across {companyCount}{" "}
              {companyCount === 1 ? "company" : "companies"}
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-text-muted">
              Not enough data to calculate growth distribution. At least two
              periods of data per company are needed.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RechartsBarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={chartTheme.grid}
                vertical={false}
              />
              <XAxis
                dataKey="bucket"
                tick={{ fill: chartTheme.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: chartTheme.tick, fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                dx={-5}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: chartTheme.cursor }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((entry) => (
                  <Cell
                    key={entry.bucket}
                    fill={BUCKET_COLORS[entry.bucket] ?? "#6b7280"}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        {hasData && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-border-subtle pt-3">
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="h-2.5 w-2.5 rounded-sm bg-[var(--error-solid)]" />
              <span>Negative growth</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-text-muted">
              <div className="h-2.5 w-2.5 rounded-sm bg-[var(--success-solid)]" />
              <span>Positive growth</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

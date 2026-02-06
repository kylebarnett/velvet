"use client";

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatValue } from "@/components/charts/types";

type YoYDataPoint = {
  period: string;
  label: string;
  currentYear: number | null;
  priorYear: number | null;
};

type YoYComparisonChartProps = {
  data: YoYDataPoint[];
  metricName: string;
  currentYear: number;
  priorYear: number;
};

function CustomTooltip({
  active,
  payload,
  label,
  metricName,
  currentYear,
  priorYear,
}: {
  active?: boolean;
  payload?: Array<{ value: number | null; dataKey: string; color: string }>;
  label?: string;
  metricName: string;
  currentYear: number;
  priorYear: number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="mb-1 text-xs text-white/50">{label}</p>
      {payload.map((entry) => {
        const yearLabel =
          entry.dataKey === "currentYear"
            ? String(currentYear)
            : String(priorYear);
        return (
          <div key={entry.dataKey} className="flex items-center gap-2 text-sm">
            <div
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-white/60">{yearLabel}:</span>
            <span className="font-medium text-white">
              {entry.value != null
                ? formatValue(entry.value, metricName)
                : "N/A"}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function YoYComparisonChart({
  data,
  metricName,
  currentYear,
  priorYear,
}: YoYComparisonChartProps) {
  const hasData = data.some(
    (d) => d.currentYear !== null || d.priorYear !== null
  );

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent transition-all duration-300 hover:border-white/[0.12]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20 text-blue-400">
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
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Year-over-Year Comparison</h3>
            <p className="text-xs text-white/40">
              {metricName} &mdash; {currentYear} vs {priorYear}
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-white/40">
              Not enough data for year-over-year comparison. Data for both{" "}
              {currentYear} and {priorYear} is needed.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => formatValue(value, metricName)}
                dx={-5}
                width={80}
              />
              <Tooltip
                content={
                  <CustomTooltip
                    metricName={metricName}
                    currentYear={currentYear}
                    priorYear={priorYear}
                  />
                }
              />
              <Legend
                wrapperStyle={{ paddingTop: 10 }}
                formatter={(value) => {
                  const label =
                    value === "currentYear"
                      ? String(currentYear)
                      : String(priorYear);
                  return (
                    <span className="text-xs text-white/70">{label}</span>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="currentYear"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
                name="currentYear"
              />
              <Line
                type="monotone"
                dataKey="priorYear"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth={2}
                strokeDasharray="6 3"
                dot={{
                  fill: "rgba(255,255,255,0.3)",
                  strokeWidth: 0,
                  r: 3,
                }}
                activeDot={{ r: 5 }}
                connectNulls
                name="priorYear"
              />
            </RechartsLineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

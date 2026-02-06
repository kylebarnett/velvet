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

import { formatValue } from "@/components/charts/types";

type CompanyBenchmark = {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  percentile: number | null;
};

type BenchmarkData = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
};

type BenchmarkChartProps = {
  companies: CompanyBenchmark[];
  benchmark: BenchmarkData;
  metricName: string;
  height?: number;
};

function getBarColor(percentile: number | null): string {
  if (percentile === null) return "#71717a"; // zinc-500
  if (percentile < 25) return "#f87171"; // red-400
  if (percentile < 50) return "#fbbf24"; // amber-400
  if (percentile < 75) return "#60a5fa"; // blue-400
  return "#34d399"; // emerald-400
}

const REFERENCE_LINE_STYLES = {
  p25: { stroke: "#f87171", label: "P25" },
  p50: { stroke: "#fbbf24", label: "P50" },
  p75: { stroke: "#60a5fa", label: "P75" },
  p90: { stroke: "#34d399", label: "P90" },
} as const;

type TooltipPayloadItem = {
  payload: {
    name: string;
    value: number;
    formattedValue: string;
    percentile: number | null;
  };
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0].payload;
  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-xs font-medium text-white">{data.name}</p>
      <p className="mt-0.5 text-sm tabular-nums text-white/80">
        {data.formattedValue}
      </p>
      {data.percentile !== null && (
        <p className="mt-0.5 text-[10px] text-white/50">
          {data.percentile}th percentile
        </p>
      )}
    </div>
  );
}

export function BenchmarkChart({
  companies,
  benchmark,
  metricName,
  height = 380,
}: BenchmarkChartProps) {
  if (companies.length === 0) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40"
        style={{ height }}
      >
        No company data available
      </div>
    );
  }

  // Sort companies by value descending for the chart
  const chartData = [...companies]
    .sort((a, b) => b.value - a.value)
    .map((c) => ({
      name: c.name.length > 16 ? c.name.slice(0, 14) + "..." : c.name,
      fullName: c.name,
      value: c.value,
      formattedValue: c.formattedValue,
      percentile: c.percentile,
    }));

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">
          {metricName} - Portfolio vs Benchmarks
        </h3>
        <div className="flex items-center gap-3">
          {(
            Object.entries(REFERENCE_LINE_STYLES) as Array<
              [
                keyof typeof REFERENCE_LINE_STYLES,
                (typeof REFERENCE_LINE_STYLES)[keyof typeof REFERENCE_LINE_STYLES],
              ]
            >
          ).map(([key, style]) => (
            <span key={key} className="flex items-center gap-1.5">
              <span
                className="inline-block h-0.5 w-4"
                style={{ backgroundColor: style.stroke }}
              />
              <span className="text-[10px] text-white/40">{style.label}</span>
            </span>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 16, left: 16, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={10}
            interval={0}
            angle={companies.length > 6 ? -30 : 0}
            textAnchor={companies.length > 6 ? "end" : "middle"}
            height={companies.length > 6 ? 60 : 30}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v: number) => formatValue(v, metricName)}
            dx={-5}
            width={80}
          />
          <Tooltip
            content={<CustomTooltip />}
            cursor={{ fill: "rgba(255,255,255,0.03)" }}
          />

          {/* Percentile reference lines */}
          <ReferenceLine
            y={benchmark.p25}
            stroke={REFERENCE_LINE_STYLES.p25.stroke}
            strokeDasharray="6 3"
            strokeWidth={1}
          />
          <ReferenceLine
            y={benchmark.p50}
            stroke={REFERENCE_LINE_STYLES.p50.stroke}
            strokeDasharray="6 3"
            strokeWidth={1.5}
          />
          <ReferenceLine
            y={benchmark.p75}
            stroke={REFERENCE_LINE_STYLES.p75.stroke}
            strokeDasharray="6 3"
            strokeWidth={1}
          />
          <ReferenceLine
            y={benchmark.p90}
            stroke={REFERENCE_LINE_STYLES.p90.stroke}
            strokeDasharray="6 3"
            strokeWidth={1}
          />

          <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {chartData.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getBarColor(entry.percentile)}
                fillOpacity={0.8}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

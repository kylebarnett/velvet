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

import { getChartColor, formatValue, formatPeriod } from "@/components/charts/types";
import type { NormalizationMode } from "./normalization-toggle";

type ComparisonChartProps = {
  /** Chart data: array of objects with `period` key + one key per company name */
  data: Array<Record<string, string | number | null>>;
  /** Company names to plot as separate series */
  companies: string[];
  /** The metric being displayed (for value formatting) */
  metricName: string;
  /** Period type for axis formatting */
  periodType: string;
  /** Current normalization mode (affects Y-axis label) */
  normalization: NormalizationMode;
  /** Chart height in pixels */
  height?: number;
};

function getYAxisLabel(normalization: NormalizationMode): string {
  switch (normalization) {
    case "indexed":
      return "Index (Base 100)";
    case "percent_change":
      return "% Change";
    default:
      return "";
  }
}

function formatYAxisTick(
  value: number,
  normalization: NormalizationMode,
  metricName: string
): string {
  if (normalization === "percent_change") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(0)}%`;
  }
  if (normalization === "indexed") {
    return value.toFixed(0);
  }
  return formatValue(value, metricName);
}

function formatTooltipValue(
  value: number,
  normalization: NormalizationMode,
  metricName: string
): string {
  if (normalization === "percent_change") {
    return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
  }
  if (normalization === "indexed") {
    return value.toFixed(1);
  }
  return formatValue(value, metricName);
}

export function ComparisonChart({
  data,
  companies,
  metricName,
  periodType,
  normalization,
  height = 360,
}: ComparisonChartProps) {
  if (!data.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40"
        style={{ height }}
      >
        No data available for the selected parameters
      </div>
    );
  }

  const yAxisLabel = getYAxisLabel(normalization);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-medium text-white/80">{metricName}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 10, right: 16, left: 16, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(255,255,255,0.06)"
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatYAxisTick(v, normalization, metricName)}
            dx={-5}
            width={80}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: "rgba(255,255,255,0.3)",
                    fontSize: 10,
                    dx: -10,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(9, 9, 11, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
            }}
            itemStyle={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}
            labelStyle={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 4,
            }}
            formatter={(value, name) => [
              formatTooltipValue(value as number, normalization, metricName),
              name,
            ]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value: string) => (
              <span className="text-xs text-white/70">{value}</span>
            )}
          />
          {companies.map((company, index) => (
            <Line
              key={company}
              type="monotone"
              dataKey={company}
              name={company}
              stroke={getChartColor(index)}
              strokeWidth={2}
              dot={{ fill: getChartColor(index), strokeWidth: 0, r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

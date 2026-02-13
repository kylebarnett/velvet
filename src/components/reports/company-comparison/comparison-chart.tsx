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

import { getChartColor, formatValue, formatCompactValue, formatPeriod } from "@/components/charts/types";
import { useChartTheme } from "@/hooks/use-chart-theme";
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
  return formatCompactValue(value, metricName);
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
        className="flex items-center justify-center rounded-xl border border-border-default card-surface text-text-muted"
        style={{ height }}
      >
        No data available for the selected parameters
      </div>
    );
  }

  const chartTheme = useChartTheme();
  const yAxisLabel = getYAxisLabel(normalization);

  return (
    <div className="rounded-xl border border-border-default card-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-text-primary">{metricName}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <RechartsLineChart
          data={data}
          margin={{ top: 10, right: 16, left: 16, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="period"
            tick={{ fill: chartTheme.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: chartTheme.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatYAxisTick(v, normalization, metricName)}
            dx={-5}
            width={85}
            label={
              yAxisLabel
                ? {
                    value: yAxisLabel,
                    angle: -90,
                    position: "insideLeft",
                    fill: chartTheme.secondaryLine,
                    fontSize: 10,
                    dx: -10,
                  }
                : undefined
            }
          />
          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.tooltipBorder}`,
              borderRadius: "8px",
              padding: "8px 12px",
              boxShadow: `0 4px 12px ${chartTheme.tooltipShadow}`,
            }}
            itemStyle={{ color: chartTheme.tooltipText, fontSize: 12 }}
            labelStyle={{
              color: chartTheme.tooltipLabel,
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
              <span className="text-xs text-text-secondary">{value}</span>
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

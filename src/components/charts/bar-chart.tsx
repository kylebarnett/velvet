"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { ChartProps, getChartColor, formatValue } from "./types";
import { useChartTheme } from "@/hooks/use-chart-theme";

export function BarChart({
  data,
  metrics,
  title,
  showLegend = true,
  height = 300,
}: ChartProps) {
  const chartTheme = useChartTheme();

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-text-muted">
        No data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {title && (
        <h3 className="mb-2 text-sm font-medium text-text-secondary">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
            tickFormatter={(value) => formatValue(value)}
            dx={-5}
            width={80}
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
            labelStyle={{ color: chartTheme.tooltipLabel, fontSize: 11, marginBottom: 4 }}
            formatter={(value, name) => [formatValue(value as number, name as string), name]}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-xs text-text-secondary">{value}</span>
              )}
            />
          )}
          {metrics.map((metric, index) => (
            <Bar
              key={metric}
              dataKey={metric}
              fill={getChartColor(index)}
              radius={[4, 4, 0, 0]}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

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

export function BarChart({
  data,
  metrics,
  title,
  showLegend = true,
  height = 300,
}: ChartProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        No data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {title && (
        <h3 className="mb-2 text-sm font-medium text-white/80">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={height}>
        <RechartsBarChart data={data} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
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
            tickFormatter={(value) => formatValue(value)}
            dx={-5}
            width={80}
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
            labelStyle={{ color: "rgba(255,255,255,0.5)", fontSize: 11, marginBottom: 4 }}
            formatter={(value, name) => [formatValue(value as number, name as string), name]}
          />
          {showLegend && (
            <Legend
              wrapperStyle={{ paddingTop: 10 }}
              formatter={(value) => (
                <span className="text-xs text-white/70">{value}</span>
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

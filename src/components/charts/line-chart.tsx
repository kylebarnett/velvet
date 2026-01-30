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

import { ChartProps, getChartColor, formatValue } from "./types";

export function LineChart({
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
        <RechartsLineChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
          <XAxis
            dataKey="period"
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
            tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
            axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
            tickFormatter={(value) => formatValue(value)}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(24, 24, 27, 0.95)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "white",
            }}
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
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={getChartColor(index)}
              strokeWidth={2}
              dot={{ fill: getChartColor(index), strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

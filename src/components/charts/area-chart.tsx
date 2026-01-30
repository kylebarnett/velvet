"use client";

import {
  AreaChart as RechartsAreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { ChartProps, getChartColor, formatValue } from "./types";

export function AreaChart({
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
        <RechartsAreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            {metrics.map((metric, index) => (
              <linearGradient
                key={metric}
                id={`gradient-${metric.replace(/\s+/g, "-")}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={getChartColor(index)} stopOpacity={0.3} />
                <stop offset="95%" stopColor={getChartColor(index)} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
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
            <Area
              key={metric}
              type="monotone"
              dataKey={metric}
              stroke={getChartColor(index)}
              strokeWidth={2}
              fill={`url(#gradient-${metric.replace(/\s+/g, "-")})`}
              connectNulls
            />
          ))}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

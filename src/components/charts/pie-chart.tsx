"use client";

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { getChartColor, formatValue } from "./types";

type PieChartProps = {
  data: Array<{ name: string; value: number }>;
  title?: string;
  showLegend?: boolean;
  height?: number;
};

export function PieChart({
  data,
  title,
  showLegend = true,
  height = 300,
}: PieChartProps) {
  if (!data.length || data.every((d) => d.value === 0)) {
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
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={90}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) =>
              `${name}: ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            labelLine={{ stroke: "rgba(255,255,255,0.3)" }}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChartColor(index)}
                stroke="rgba(255,255,255,0.1)"
              />
            ))}
          </Pie>
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
              formatter={(value) => (
                <span className="text-xs text-white/70">{value}</span>
              )}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

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
import { useChartTheme } from "@/hooks/use-chart-theme";

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
  const chartTheme = useChartTheme();

  if (!data.length || data.every((d) => d.value === 0)) {
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
            labelLine={{ stroke: chartTheme.tick }}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={getChartColor(index)}
                stroke={chartTheme.tooltipBorder}
              />
            ))}
          </Pie>
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
              formatter={(value) => (
                <span className="text-xs text-text-secondary">{value}</span>
              )}
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

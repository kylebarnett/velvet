"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LabelList,
} from "recharts";

import { formatValue } from "@/components/charts/types";
import { useChartTheme } from "@/hooks/use-chart-theme";

type FundPerformanceChartProps = {
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
  currency: string;
};

const BAR_COLORS = ["#3b82f6", "#10b981", "#f59e0b"];

function formatAxisValue(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value}`;
}

export function FundPerformanceChart({
  totalInvested,
  totalCurrentValue,
  totalRealizedValue,
}: FundPerformanceChartProps) {
  const chartTheme = useChartTheme();

  if (totalInvested === 0 && totalCurrentValue === 0 && totalRealizedValue === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-border-default card-surface text-sm text-text-muted">
        Add investments to see the performance chart.
      </div>
    );
  }

  const data = [
    { name: "Invested", value: totalInvested, color: BAR_COLORS[0] },
    { name: "Unrealized", value: totalCurrentValue, color: BAR_COLORS[1] },
    { name: "Realized", value: totalRealizedValue, color: BAR_COLORS[2] },
  ];

  return (
    <div className="rounded-xl border border-border-default card-surface p-4">
      <h3 className="mb-3 text-sm font-medium text-text-primary">Fund Value Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBarChart
          data={data}
          margin={{ top: 20, right: 10, left: 20, bottom: 10 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.grid}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{ fill: chartTheme.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            dy={10}
          />
          <YAxis
            domain={[0, "auto"]}
            allowDecimals={false}
            tick={{ fill: chartTheme.tick, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={formatAxisValue}
            dx={-5}
            width={60}
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
            formatter={(value) => [formatValue(value as number, "Revenue"), "Amount"]}
          />
          <Bar dataKey="value" name="Amount" radius={[4, 4, 0, 0]} minPointSize={8}>
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              position="top"
              formatter={(v: unknown) => formatAxisValue(Number(v))}
              style={{ fill: chartTheme.tick, fontSize: 10, fontWeight: 500 }}
            />
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

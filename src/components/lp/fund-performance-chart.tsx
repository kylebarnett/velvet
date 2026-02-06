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

import { formatValue } from "@/components/charts/types";

type FundPerformanceChartProps = {
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
  currency: string;
};

export function FundPerformanceChart({
  totalInvested,
  totalCurrentValue,
  totalRealizedValue,
}: FundPerformanceChartProps) {
  if (totalInvested === 0 && totalCurrentValue === 0 && totalRealizedValue === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-sm text-white/40">
        Add investments to see the performance chart.
      </div>
    );
  }

  const data = [
    {
      name: "Invested",
      value: totalInvested,
    },
    {
      name: "Unrealized",
      value: totalCurrentValue,
    },
    {
      name: "Realized",
      value: totalRealizedValue,
    },
    {
      name: "Total Value",
      value: totalCurrentValue + totalRealizedValue,
    },
  ];

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-3 text-sm font-medium text-white/80">Fund Value Breakdown</h3>
      <ResponsiveContainer width="100%" height={280}>
        <RechartsBarChart
          data={data}
          margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
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
          />
          <YAxis
            tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => formatValue(value, "Revenue")}
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
            labelStyle={{
              color: "rgba(255,255,255,0.5)",
              fontSize: 11,
              marginBottom: 4,
            }}
            formatter={(value) => [formatValue(value as number, "Revenue"), "Amount"]}
          />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span className="text-xs text-white/70">{value}</span>
            )}
          />
          <Bar
            dataKey="value"
            name="Amount"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
          />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

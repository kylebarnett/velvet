"use client";

import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { formatValue } from "@/components/charts/types";

type MetricCardProps = {
  title: string;
  value: number | null;
  previousValue: number | null;
  showTrend?: boolean;
  onClick?: () => void;
};

export function MetricCard({
  title,
  value,
  previousValue,
  showTrend = true,
  onClick,
}: MetricCardProps) {
  const percentChange =
    value != null && previousValue != null && previousValue !== 0
      ? ((value - previousValue) / Math.abs(previousValue)) * 100
      : null;

  return (
    <div
      className={`flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 ${onClick ? "cursor-pointer transition-colors hover:bg-white/[0.08]" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? (e) => { if (e.key === "Enter" || e.key === " ") onClick(); } : undefined}
    >
      <div className="text-xs font-medium text-white/60">{title}</div>
      <div className="mt-2 flex items-end justify-between">
        <span className="text-2xl font-semibold">
          {formatValue(value, title)}
        </span>
        {showTrend && (
          <TrendIndicator percentChange={percentChange} />
        )}
      </div>
    </div>
  );
}

function TrendIndicator({ percentChange }: { percentChange: number | null }) {
  if (percentChange == null) {
    return (
      <div className="flex items-center gap-1 text-white/40">
        <Minus className="h-4 w-4" />
      </div>
    );
  }

  if (percentChange > 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-400">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-medium">+{percentChange.toFixed(1)}%</span>
      </div>
    );
  }

  if (percentChange < 0) {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-medium">{percentChange.toFixed(1)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-white/40">
      <Minus className="h-4 w-4" />
      <span className="text-xs font-medium">0%</span>
    </div>
  );
}

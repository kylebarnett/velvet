"use client";

import { DollarSign, TrendingUp, BarChart3, Flame, Users, PieChart, Building2, CheckCircle2 } from "lucide-react";
import { formatValue } from "@/components/charts/types";

type KPICardsProps = {
  aggregates: Record<
    string,
    {
      sum: number | null;
      average: number;
      median: number;
      count: number;
      canSum: boolean;
    }
  >;
  totalCompanies: number;
  companiesWithData: number;
  onMetricClick?: (metricName: string) => void;
};

type KPIColor = "kpi-1" | "kpi-2" | "kpi-3" | "kpi-4" | "neutral";

const KPI_COLORS: Record<KPIColor, { bg: string; accent: string; ring: string }> = {
  "kpi-1": { bg: "var(--kpi-1-bg)", accent: "var(--kpi-1-accent)", ring: "var(--kpi-1-ring)" },
  "kpi-2": { bg: "var(--kpi-2-bg)", accent: "var(--kpi-2-accent)", ring: "var(--kpi-2-ring)" },
  "kpi-3": { bg: "var(--kpi-3-bg)", accent: "var(--kpi-3-accent)", ring: "var(--kpi-3-ring)" },
  "kpi-4": { bg: "var(--kpi-4-bg)", accent: "var(--kpi-4-accent)", ring: "var(--kpi-4-ring)" },
  neutral: { bg: "var(--bg-elevated)", accent: "var(--text-primary)", ring: "var(--border-default)" },
};

// Priority KPIs with icons and accent colors
const PRIORITY_KPIS: Array<{
  metric: string;
  label: string;
  useSum: boolean;
  icon: React.ComponentType<{ className?: string }>;
  color: KPIColor;
}> = [
  { metric: "revenue", label: "Total Revenue", useSum: true, icon: DollarSign, color: "kpi-1" },
  { metric: "mrr", label: "Total MRR", useSum: true, icon: TrendingUp, color: "kpi-2" },
  { metric: "arr", label: "Total ARR", useSum: true, icon: BarChart3, color: "kpi-3" },
  { metric: "burn rate", label: "Avg Burn Rate", useSum: false, icon: Flame, color: "kpi-4" },
  { metric: "headcount", label: "Total Headcount", useSum: true, icon: Users, color: "kpi-1" },
  { metric: "gross margin", label: "Avg Gross Margin", useSum: false, icon: PieChart, color: "kpi-2" },
];

// Default cards for portfolio summary
const DEFAULT_CARDS: Array<{
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: KPIColor;
}> = [
  { key: "companies", label: "Portfolio Companies", icon: Building2, color: "neutral" },
  { key: "withMetrics", label: "With Metrics", icon: CheckCircle2, color: "kpi-1" },
];

type KPIDisplay = {
  metric: string | null;
  label: string;
  value: string;
  count: number;
  coverage: number;
  icon: React.ComponentType<{ className?: string }>;
  color: KPIColor;
  clickable: boolean;
};

export function KPICards({ aggregates, totalCompanies, companiesWithData, onMetricClick }: KPICardsProps) {
  // Find KPIs that have data
  const kpis: KPIDisplay[] = PRIORITY_KPIS.filter((kpi) => aggregates[kpi.metric])
    .slice(0, 4)
    .map((kpi) => {
      const data = aggregates[kpi.metric];
      const value = kpi.useSum && data.canSum ? data.sum : data.average;
      return {
        metric: kpi.metric,
        label: kpi.label,
        value: formatValue(value, kpi.metric),
        count: data.count,
        coverage: Math.round((data.count / totalCompanies) * 100),
        icon: kpi.icon,
        color: kpi.color,
        clickable: true,
      };
    });

  // Add summary cards if we don't have enough KPIs
  if (kpis.length < 4) {
    kpis.unshift({
      metric: null,
      label: DEFAULT_CARDS[0].label,
      value: String(totalCompanies),
      count: totalCompanies,
      coverage: 100,
      icon: DEFAULT_CARDS[0].icon,
      color: DEFAULT_CARDS[0].color,
      clickable: false,
    });
  }

  if (kpis.length < 4 && companiesWithData !== totalCompanies) {
    kpis.push({
      metric: null,
      label: DEFAULT_CARDS[1].label,
      value: String(companiesWithData),
      count: companiesWithData,
      coverage: Math.round((companiesWithData / totalCompanies) * 100),
      icon: DEFAULT_CARDS[1].icon,
      color: DEFAULT_CARDS[1].color,
      clickable: false,
    });
  }

  if (kpis.length === 0) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle p-5 min-h-[120px]">
            <span className="text-2xl font-bold text-text-faint">--</span>
            <span className="mt-1 text-xs text-text-muted">No data</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.slice(0, 4).map((kpi, index) => {
        const colors = KPI_COLORS[kpi.color];
        const Icon = kpi.icon;

        return (
          <div
            key={kpi.label}
            role={kpi.clickable && onMetricClick ? "button" : undefined}
            tabIndex={kpi.clickable && onMetricClick ? 0 : undefined}
            onClick={() => kpi.clickable && kpi.metric && onMetricClick?.(kpi.metric)}
            onKeyDown={(e) => {
              if (kpi.clickable && kpi.metric && onMetricClick && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                onMetricClick(kpi.metric);
              }
            }}
            className={`group card-surface relative overflow-hidden rounded-2xl p-5 transition-all duration-300 ${
              kpi.clickable && onMetricClick ? "cursor-pointer card-hover-lift" : ""
            }`}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            {/* Gradient overlay */}
            <div
              className="absolute inset-0 opacity-60 transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: `linear-gradient(135deg, ${colors.bg} 0%, transparent 70%)` }}
            />

            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: colors.bg,
                    color: colors.accent,
                    boxShadow: `inset 0 0 0 1px ${colors.ring}`,
                  }}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {kpi.coverage < 100 && (
                  <div className="flex items-center gap-1 rounded-full bg-bg-elevated px-2 py-1 text-[10px] font-medium text-text-tertiary">
                    <div className="h-1.5 w-1.5 rounded-full bg-[var(--warning-accent)]" />
                    {kpi.coverage}%
                  </div>
                )}
              </div>

              {/* Value */}
              <div className="mt-4">
                <div className="text-4xl font-bold tabular-nums tracking-tighter text-text-primary">
                  {kpi.value}
                </div>
                <div className="mt-1 text-xs font-medium uppercase tracking-wider text-text-muted">{kpi.label}</div>
              </div>

              {/* Footer */}
              {kpi.count < totalCompanies && (
                <div className="mt-3 flex items-center gap-2 border-t border-border-subtle pt-3">
                  <div className="h-1 flex-1 overflow-hidden rounded-full bg-bg-hover">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${kpi.coverage}%`,
                        background: `linear-gradient(90deg, ${colors.ring}, ${colors.bg})`,
                      }}
                    />
                  </div>
                  <span className="text-xs text-text-muted">
                    {kpi.count}/{totalCompanies}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

"use client";

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

// Priority KPIs with icons and accent colors
const PRIORITY_KPIS = [
  {
    metric: "revenue",
    label: "Total Revenue",
    useSum: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    accent: "text-emerald-400",
    ring: "ring-emerald-500/20"
  },
  {
    metric: "mrr",
    label: "Total MRR",
    useSum: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    gradient: "from-blue-500/20 via-blue-500/5 to-transparent",
    accent: "text-blue-400",
    ring: "ring-blue-500/20"
  },
  {
    metric: "arr",
    label: "Total ARR",
    useSum: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: "from-violet-500/20 via-violet-500/5 to-transparent",
    accent: "text-violet-400",
    ring: "ring-violet-500/20"
  },
  {
    metric: "burn rate",
    label: "Avg Burn Rate",
    useSum: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z" />
      </svg>
    ),
    gradient: "from-orange-500/20 via-orange-500/5 to-transparent",
    accent: "text-orange-400",
    ring: "ring-orange-500/20"
  },
  {
    metric: "headcount",
    label: "Total Headcount",
    useSum: true,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    gradient: "from-cyan-500/20 via-cyan-500/5 to-transparent",
    accent: "text-cyan-400",
    ring: "ring-cyan-500/20"
  },
  {
    metric: "gross margin",
    label: "Avg Gross Margin",
    useSum: false,
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    gradient: "from-pink-500/20 via-pink-500/5 to-transparent",
    accent: "text-pink-400",
    ring: "ring-pink-500/20"
  },
];

// Default cards for portfolio summary
const DEFAULT_CARDS = [
  {
    key: "companies",
    label: "Portfolio Companies",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    gradient: "from-white/10 via-white/5 to-transparent",
    accent: "text-white",
    ring: "ring-white/10"
  },
  {
    key: "withMetrics",
    label: "With Metrics",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    gradient: "from-emerald-500/20 via-emerald-500/5 to-transparent",
    accent: "text-emerald-400",
    ring: "ring-emerald-500/20"
  }
];

type KPIDisplay = {
  metric: string | null;
  label: string;
  value: string;
  count: number;
  coverage: number;
  icon: React.ReactNode;
  gradient: string;
  accent: string;
  ring: string;
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
        gradient: kpi.gradient,
        accent: kpi.accent,
        ring: kpi.ring,
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
      gradient: DEFAULT_CARDS[0].gradient,
      accent: DEFAULT_CARDS[0].accent,
      ring: DEFAULT_CARDS[0].ring,
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
      gradient: DEFAULT_CARDS[1].gradient,
      accent: DEFAULT_CARDS[1].accent,
      ring: DEFAULT_CARDS[1].ring,
      clickable: false,
    });
  }

  if (kpis.length === 0) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.08]">
            <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-white/60">No metric data available yet</p>
          <p className="mt-1 text-sm text-white/40">
            Metrics will appear here once founders submit data
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.slice(0, 4).map((kpi, index) => (
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
          className={`group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5 transition-all duration-300 hover:border-white/[0.15] hover:shadow-lg hover:shadow-black/20 ${
            kpi.clickable && onMetricClick ? "cursor-pointer hover:scale-[1.02]" : ""
          }`}
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* Gradient overlay */}
          <div className={`absolute inset-0 bg-gradient-to-br ${kpi.gradient} opacity-60 transition-opacity duration-300 group-hover:opacity-100`} />

          {/* Subtle glow effect on hover */}
          <div className="absolute -inset-px rounded-2xl bg-gradient-to-br from-white/[0.08] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          <div className="relative">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] ring-1 ${kpi.ring} ${kpi.accent} transition-transform duration-300 group-hover:scale-110`}>
                {kpi.icon}
              </div>
              {kpi.coverage < 100 && (
                <div className="flex items-center gap-1 rounded-full bg-white/[0.05] px-2 py-1 text-[10px] font-medium text-white/60">
                  <div className="h-1.5 w-1.5 rounded-full bg-amber-400/60" />
                  {kpi.coverage}%
                </div>
              )}
            </div>

            {/* Value */}
            <div className="mt-4">
              <div className="text-3xl font-semibold tracking-tight text-white">
                {kpi.value}
              </div>
              <div className="mt-1 text-sm text-white/60">{kpi.label}</div>
            </div>

            {/* Footer */}
            {kpi.count < totalCompanies && (
              <div className="mt-3 flex items-center gap-2 border-t border-white/[0.05] pt-3">
                <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${kpi.gradient.replace('/20', '/40').replace('/5', '/20')}`}
                    style={{ width: `${kpi.coverage}%` }}
                  />
                </div>
                <span className="text-xs text-white/40">
                  {kpi.count}/{totalCompanies}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

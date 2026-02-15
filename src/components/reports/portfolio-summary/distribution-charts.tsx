"use client";

import { Building2, BarChart3 } from "lucide-react";
import { getChartColor } from "@/components/charts/types";

type DistributionData = {
  name: string;
  value: number;
  key: string;
};

type DistributionChartsProps = {
  byIndustry: DistributionData[];
  byStage: DistributionData[];
};

const CHART_CONFIGS = [
  {
    key: "industry",
    title: "By Industry",
    subtitle: "Portfolio breakdown",
    icon: Building2,
    iconClasses: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]",
  },
  {
    key: "stage",
    title: "By Stage",
    subtitle: "Investment phases",
    icon: BarChart3,
    iconClasses: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)]",
  },
];

export function DistributionCharts({
  byIndustry,
  byStage,
}: DistributionChartsProps) {
  const dataMap: Record<string, DistributionData[]> = {
    industry: byIndustry,
    stage: byStage,
  };

  const hasData = byIndustry.length > 0 || byStage.length > 0;

  if (!hasData) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle p-8 min-h-[180px]">
            <span className="text-2xl font-bold text-text-faint">--</span>
            <span className="mt-1 text-xs text-text-muted">No data</span>
          </div>
        ))}
      </div>
    );
  }

  const chartsToShow = CHART_CONFIGS.filter((config) => dataMap[config.key].length > 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {chartsToShow.map((config) => {
        const data = dataMap[config.key];
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const maxValue = Math.max(...data.map((d) => d.value));
        const Icon = config.icon;

        return (
          <div
            key={config.key}
            className="card-surface rounded-2xl"
          >
            <div className="p-5">
              {/* Header */}
              <div className="mb-5 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.iconClasses}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-text-primary">{config.title}</h3>
                  <p className="text-xs text-text-muted">{config.subtitle}</p>
                </div>
              </div>

              {/* Horizontal bar rows */}
              <div className="space-y-3">
                {data.map((item, index) => {
                  const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                  const barWidth = maxValue > 0 ? (item.value / maxValue) * 100 : 0;

                  return (
                    <div key={item.key}>
                      <div className="mb-1 flex items-baseline justify-between gap-2">
                        <span className="text-sm text-text-secondary truncate">{item.name}</span>
                        <span className="shrink-0 text-sm tabular-nums text-text-primary">
                          {item.value}
                          <span className="ml-1 text-xs text-text-muted">({pct}%)</span>
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-bg-elevated">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${barWidth}%`,
                            backgroundColor: getChartColor(index),
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total footer */}
              <div className="mt-4 flex items-center justify-between border-t border-border-subtle pt-3">
                <span className="text-xs text-text-muted">Total</span>
                <span className="text-sm font-medium tabular-nums text-text-primary">{total}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

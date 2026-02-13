"use client";

import { Building2, BarChart3 } from "lucide-react";
import { PieChart } from "@/components/charts/pie-chart";

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
      <div className="flex h-full flex-col gap-4">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border-subtle p-8 min-h-[180px]">
            <span className="text-2xl font-bold text-text-faint">--</span>
            <span className="mt-1 text-xs text-text-muted">No data</span>
          </div>
        ))}
      </div>
    );
  }

  // Filter to only show charts with data
  const chartsToShow = CHART_CONFIGS.filter((config) => dataMap[config.key].length > 0);

  return (
    <div className="flex h-full flex-col gap-4">
      {chartsToShow.map((config) => {
        const data = dataMap[config.key];
        const total = data.reduce((sum, d) => sum + d.value, 0);
        const Icon = config.icon;

        return (
          <div
            key={config.key}
            className="card-surface group rounded-2xl transition-all duration-300"
          >
            <div className="p-5">
              {/* Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${config.iconClasses}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold tracking-tight text-text-primary">{config.title}</h3>
                  <p className="text-xs text-text-muted">{config.subtitle}</p>
                </div>
              </div>

              {/* Chart */}
              <div className="relative">
                <PieChart
                  data={data}
                  showLegend={false}
                  height={180}
                />
              </div>

              {/* Legend */}
              <div className="mt-4 space-y-1.5">
                {data.slice(0, 4).map((item) => (
                  <div key={item.key} className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-text-primary">{item.value}</span>
                      <span className="text-xs text-text-faint">
                        ({Math.round((item.value / total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
                {data.length > 4 && (
                  <div className="pt-1 text-xs text-text-faint">
                    +{data.length - 4} more
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

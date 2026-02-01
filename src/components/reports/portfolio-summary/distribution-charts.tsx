"use client";

import { PieChart } from "@/components/charts/pie-chart";

type DistributionData = {
  name: string;
  value: number;
  key: string;
};

type DistributionChartsProps = {
  byIndustry: DistributionData[];
  byStage: DistributionData[];
  byBusinessModel: DistributionData[];
};

const CHART_CONFIGS = [
  {
    key: "industry",
    title: "By Industry",
    subtitle: "Portfolio breakdown",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    gradient: "from-blue-500/[0.08] via-transparent to-transparent",
    iconBg: "from-blue-500/20 to-blue-500/5",
    iconRing: "ring-blue-500/20",
    iconColor: "text-blue-400",
  },
  {
    key: "stage",
    title: "By Stage",
    subtitle: "Investment phases",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    gradient: "from-emerald-500/[0.08] via-transparent to-transparent",
    iconBg: "from-emerald-500/20 to-emerald-500/5",
    iconRing: "ring-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    key: "businessModel",
    title: "By Business Model",
    subtitle: "Revenue models",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
      </svg>
    ),
    gradient: "from-violet-500/[0.08] via-transparent to-transparent",
    iconBg: "from-violet-500/20 to-violet-500/5",
    iconRing: "ring-violet-500/20",
    iconColor: "text-violet-400",
  },
];

export function DistributionCharts({
  byIndustry,
  byStage,
  byBusinessModel,
}: DistributionChartsProps) {
  const dataMap: Record<string, DistributionData[]> = {
    industry: byIndustry,
    stage: byStage,
    businessModel: byBusinessModel,
  };

  const hasData =
    byIndustry.length > 0 || byStage.length > 0 || byBusinessModel.length > 0;

  if (!hasData) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-8 text-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white/[0.03] via-transparent to-transparent" />
        <div className="relative">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.05] ring-1 ring-white/[0.08]">
            <svg className="h-6 w-6 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
            </svg>
          </div>
          <p className="text-white/60">No distribution data available</p>
        </div>
      </div>
    );
  }

  // Filter to only show charts with data
  const chartsToShow = CHART_CONFIGS.filter((config) => dataMap[config.key].length > 0);

  return (
    <div className={`grid gap-4 ${chartsToShow.length === 3 ? "md:grid-cols-3" : chartsToShow.length === 2 ? "md:grid-cols-2" : ""}`}>
      {chartsToShow.map((config) => {
        const data = dataMap[config.key];
        const total = data.reduce((sum, d) => sum + d.value, 0);

        return (
          <div
            key={config.key}
            className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent transition-all duration-300 hover:border-white/[0.12]"
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] ${config.gradient}`} />

            <div className="relative p-5">
              {/* Header */}
              <div className="mb-4 flex items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br ${config.iconBg} ring-1 ${config.iconRing} ${config.iconColor}`}>
                  {config.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-white">{config.title}</h3>
                  <p className="text-xs text-white/40">{config.subtitle}</p>
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
                    <span className="text-white/60">{item.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium tabular-nums text-white">{item.value}</span>
                      <span className="text-xs text-white/30">
                        ({Math.round((item.value / total) * 100)}%)
                      </span>
                    </div>
                  </div>
                ))}
                {data.length > 4 && (
                  <div className="pt-1 text-xs text-white/30">
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

"use client";

import { formatValue } from "@/components/charts/types";
import { formatPeriod } from "@/components/charts/types";

type MetricKPI = {
  name: string;
  value: number | null;
  formattedValue: string;
  periodStart: string;
  periodType: string;
};

type CompanyMetricKPIsProps = {
  metrics: MetricKPI[];
};

export function CompanyMetricKPIs({ metrics }: CompanyMetricKPIsProps) {
  if (metrics.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-text-muted">
        No metric data available.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {metrics.map((metric) => (
        <div
          key={metric.name}
          className="rounded-lg border border-border-subtle bg-bg-elevated p-3"
        >
          <div className="text-xs font-medium text-text-muted">{metric.name}</div>
          <div className="mt-1 text-lg font-semibold tabular-nums text-text-primary">
            {metric.formattedValue}
          </div>
          <div className="mt-0.5 text-[10px] text-text-faint">
            {formatPeriod(metric.periodStart, metric.periodType)}
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import { formatValue, formatPeriod } from "@/components/charts/types";

type MetricsTableProps = {
  data: Array<{
    metricName: string;
    periodType: string;
    periods: Array<{
      periodStart: string;
      periodEnd: string;
      value: number | null;
    }>;
  }>;
  title?: string;
};

export function MetricsTable({ data, title }: MetricsTableProps) {
  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        No data available
      </div>
    );
  }

  // Get all unique periods across metrics
  const allPeriods = new Set<string>();
  data.forEach((metric) => {
    metric.periods.forEach((p) => allPeriods.add(p.periodStart));
  });

  const sortedPeriods = Array.from(allPeriods).sort((a, b) =>
    new Date(b).getTime() - new Date(a).getTime()
  );

  // Limit to most recent periods for display
  const displayPeriods = sortedPeriods.slice(0, 8);

  return (
    <div className="flex h-full flex-col">
      {title && (
        <h3 className="mb-3 text-sm font-medium text-white/80">{title}</h3>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-2 text-left font-medium text-white/60">Metric</th>
              {displayPeriods.map((period) => (
                <th
                  key={period}
                  className="pb-2 text-right font-medium text-white/60"
                >
                  {formatPeriod(period, data[0]?.periodType ?? "quarterly")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((metric) => (
              <tr key={metric.metricName} className="border-b border-white/5">
                <td className="py-2 text-white/80">{metric.metricName}</td>
                {displayPeriods.map((period) => {
                  const periodData = metric.periods.find(
                    (p) => p.periodStart === period
                  );
                  return (
                    <td key={period} className="py-2 text-right font-mono">
                      {periodData
                        ? formatValue(periodData.value, metric.metricName)
                        : "-"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

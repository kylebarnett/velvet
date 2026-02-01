"use client";

import { LineChart } from "@/components/charts/line-chart";
import { MetricDataPoint } from "@/components/charts/types";

type ChartDataPoint = {
  period: string;
  label: string;
  [key: string]: string | number | null;
};

type ComparisonChartProps = {
  data: ChartDataPoint[];
  companies: Array<{ id: string; name: string }>;
  metric: string;
  portfolioAverage?: Array<{ period: string; value: number }>;
  showBenchmark?: boolean;
};

export function ComparisonChart({
  data,
  companies,
  metric,
  portfolioAverage,
  showBenchmark = true,
}: ComparisonChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40">
        No data available for comparison
      </div>
    );
  }

  // Add portfolio average to data if requested
  const metricNames = companies.map((c) => c.name);

  // Transform data to match MetricDataPoint type
  let chartData: MetricDataPoint[] = data.map((row) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { period: _period, label: _label, ...rest } = row;
    return {
      period: row.label,
      periodStart: row.period,
      periodEnd: row.period,
      ...rest,
    };
  });

  if (showBenchmark && portfolioAverage && portfolioAverage.length > 0) {
    const avgMap = new Map(portfolioAverage.map((p) => [p.period, p.value]));
    chartData = chartData.map((row) => ({
      ...row,
      "Portfolio Avg": avgMap.get(row.periodStart) ?? null,
    }));
    metricNames.push("Portfolio Avg");
  }

  const metricLabel = metric.charAt(0).toUpperCase() + metric.slice(1);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <h3 className="mb-2 text-sm font-medium text-white/80">
        {metricLabel} Comparison
      </h3>
      <LineChart
        data={chartData}
        metrics={metricNames}
        height={300}
        showLegend={true}
      />
    </div>
  );
}

"use client";

import { LineChart } from "@/components/charts/line-chart";
import { BarChart } from "@/components/charts/bar-chart";
import { AreaChart } from "@/components/charts/area-chart";
import { PieChart } from "@/components/charts/pie-chart";
import { MetricCard } from "./metric-card";
import { MetricsTable } from "./metrics-table";
import {
  Widget,
  MetricValue,
  isChartConfig,
  isMetricCardConfig,
  isTableConfig,
  getNumericValue,
  PeriodType,
} from "./types";
import { formatPeriod, MetricDataPoint } from "@/components/charts/types";

type DashboardWidgetProps = {
  widget: Widget;
  metrics: MetricValue[];
  periodTypeOverride?: PeriodType;
};

export function DashboardWidget({
  widget,
  metrics,
  periodTypeOverride,
}: DashboardWidgetProps) {
  const { config } = widget;

  if (isChartConfig(config)) {
    const periodType = periodTypeOverride ?? config.periodType;
    const chartData = prepareChartData(metrics, config.metrics, periodType);

    if (config.chartType === "pie") {
      // For pie charts, use the latest period data
      const pieData = preparePieData(metrics, config.metrics, periodType);
      return (
        <PieChart
          data={pieData}
          title={config.title}
          showLegend={config.showLegend}
          height={getChartHeight(widget.h)}
        />
      );
    }

    const ChartComponent =
      config.chartType === "bar"
        ? BarChart
        : config.chartType === "area"
          ? AreaChart
          : LineChart;

    return (
      <ChartComponent
        data={chartData}
        metrics={config.metrics}
        title={config.title}
        showLegend={config.showLegend}
        height={getChartHeight(widget.h)}
      />
    );
  }

  if (isMetricCardConfig(config)) {
    const metricData = getLatestMetricValues(metrics, config.metric);
    return (
      <MetricCard
        title={config.title ?? config.metric}
        value={metricData.current}
        previousValue={metricData.previous}
        showTrend={config.showTrend}
      />
    );
  }

  if (isTableConfig(config)) {
    const periodType = periodTypeOverride ?? config.periodType;
    const tableData = prepareTableData(metrics, config.metrics, periodType);
    return <MetricsTable data={tableData} title={config.title} />;
  }

  return (
    <div className="flex h-full items-center justify-center text-white/40">
      Unknown widget type
    </div>
  );
}

function getChartHeight(gridHeight: number): number {
  // Each grid row is approximately 100px
  // Subtract some padding for title
  return Math.max(gridHeight * 100 - 40, 150);
}

function prepareChartData(
  metrics: MetricValue[],
  metricNames: string[],
  periodType: PeriodType
): MetricDataPoint[] {
  // Filter to requested metrics and period type
  const filtered = metrics.filter(
    (m) =>
      metricNames.some((name) => name.toLowerCase() === m.metric_name.toLowerCase()) &&
      m.period_type === periodType
  );

  // Group by period
  const byPeriod = new Map<string, Record<string, number | null>>();

  for (const metric of filtered) {
    const periodKey = metric.period_start;
    if (!byPeriod.has(periodKey)) {
      byPeriod.set(periodKey, {});
    }
    const record = byPeriod.get(periodKey)!;
    record[metric.metric_name] = getNumericValue(metric.value);
  }

  // Convert to array and sort by date
  const dataPoints: MetricDataPoint[] = Array.from(byPeriod.entries())
    .map(([periodStart, values]) => ({
      period: formatPeriod(periodStart, periodType),
      periodStart,
      periodEnd: "", // Not needed for charts
      ...values,
    }))
    .sort(
      (a, b) =>
        new Date(a.periodStart).getTime() - new Date(b.periodStart).getTime()
    );

  return dataPoints;
}

function preparePieData(
  metrics: MetricValue[],
  metricNames: string[],
  periodType: PeriodType
): Array<{ name: string; value: number }> {
  // Get the most recent period
  const filtered = metrics.filter(
    (m) =>
      metricNames.some((name) => name.toLowerCase() === m.metric_name.toLowerCase()) &&
      m.period_type === periodType
  );

  // Find the most recent period
  const latestPeriod = filtered.reduce<string | null>((latest, m) => {
    if (!latest) return m.period_start;
    return new Date(m.period_start) > new Date(latest) ? m.period_start : latest;
  }, null);

  if (!latestPeriod) return [];

  // Get values for the latest period
  const latestValues = filtered.filter((m) => m.period_start === latestPeriod);

  return latestValues
    .map((m) => ({
      name: m.metric_name,
      value: getNumericValue(m.value) ?? 0,
    }))
    .filter((d) => d.value > 0);
}

function prepareTableData(
  metrics: MetricValue[],
  metricNames: string[],
  periodType: PeriodType
) {
  // Filter to requested metrics and period type
  const filtered = metrics.filter(
    (m) =>
      metricNames.some((name) => name.toLowerCase() === m.metric_name.toLowerCase()) &&
      m.period_type === periodType
  );

  // Group by metric name
  const byMetric = new Map<string, MetricValue[]>();

  for (const metric of filtered) {
    if (!byMetric.has(metric.metric_name)) {
      byMetric.set(metric.metric_name, []);
    }
    byMetric.get(metric.metric_name)!.push(metric);
  }

  // Convert to table format
  return Array.from(byMetric.entries()).map(([metricName, values]) => ({
    metricName,
    periodType,
    periods: values
      .sort(
        (a, b) =>
          new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
      )
      .map((v) => ({
        periodStart: v.period_start,
        periodEnd: v.period_end,
        value: getNumericValue(v.value),
      })),
  }));
}

function getLatestMetricValues(
  metrics: MetricValue[],
  metricName: string
): { current: number | null; previous: number | null } {
  const filtered = metrics
    .filter((m) => m.metric_name.toLowerCase() === metricName.toLowerCase())
    .sort(
      (a, b) =>
        new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
    );

  return {
    current: filtered.length > 0 ? getNumericValue(filtered[0].value) : null,
    previous: filtered.length > 1 ? getNumericValue(filtered[1].value) : null,
  };
}

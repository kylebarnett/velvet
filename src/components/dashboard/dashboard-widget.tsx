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
import { computeRollups, buildRollupDetail, type RolledUpValue } from "@/lib/metrics/rollup";

type DashboardWidgetProps = {
  widget: Widget;
  metrics: MetricValue[];
  periodTypeOverride?: PeriodType;
  onMetricClick?: (metricName: string, periodStart?: string) => void;
  /** Company ID for persisting metric order in tables */
  companyId?: string;
  /** Callback to add a new metric via modal (passed to table widgets) */
  onAddMetric?: () => void;
  /** Callback to add a metric inline within the table (investor dashboard) */
  onAddMetricInline?: (
    metricName: string,
    values: { periodStart: string; value: string }[],
  ) => Promise<boolean>;
  /** Enable click-to-edit on table cells */
  editable?: boolean;
  /** Submit a single value edit — returns true on success */
  onValueSubmit?: (metricName: string, periodStart: string, periodEnd: string, periodType: string, value: string) => Promise<boolean>;
  /** Actions rendered in the table toolbar (e.g. export button) — only used for table widgets */
  headerActions?: React.ReactNode;
};

export function DashboardWidget({
  widget,
  metrics,
  periodTypeOverride,
  onMetricClick,
  companyId,
  onAddMetric,
  onAddMetricInline,
  editable,
  onValueSubmit,
  headerActions,
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
    const metricData = getLatestMetricValues(metrics, config.metric, periodTypeOverride);
    const periodLabel =
      metricData.currentPeriodStart && metricData.currentPeriodType
        ? formatPeriod(metricData.currentPeriodStart, metricData.currentPeriodType)
        : undefined;
    return (
      <MetricCard
        title={config.title ?? config.metric}
        value={metricData.current}
        previousValue={metricData.previous}
        showTrend={config.showTrend}
        periodLabel={periodLabel}
      />
    );
  }

  if (isTableConfig(config)) {
    const periodType = periodTypeOverride ?? config.periodType;
    const tableData = prepareTableData(
      metrics,
      config.metrics,
      periodType,
      config.showAllMetrics
    );
    // Generate storage key for persisting metric order
    const storageKey = companyId ? `metrics-order-${companyId}-${widget.id}` : undefined;
    return (
      <MetricsTable
        data={tableData}
        title={config.title}
        onMetricClick={onMetricClick}
        storageKey={storageKey}
        showTotals={config.showTotals !== false}
        onAddMetric={onAddMetric}
        onAddMetricInline={onAddMetricInline}
        editable={editable}
        onValueSubmit={onValueSubmit}
        headerActions={headerActions}
      />
    );
  }

  return (
    <div className="flex h-full items-center justify-center text-text-muted">
      Unknown widget type
    </div>
  );
}

/** The UI uses "yearly" but the DB stores "annual". Normalize for comparisons. */
function dbPeriodType(pt: PeriodType): string {
  return pt === "yearly" ? "annual" : pt;
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
  const dbPt = dbPeriodType(periodType);
  const filtered = metrics.filter(
    (m) =>
      metricNames.some((name) => name.toLowerCase() === m.metric_name.toLowerCase()) &&
      m.period_type === dbPt
  );

  // Compute rollups and merge as synthetic entries
  const rollups = computeRollups(metrics, periodType);
  const existingKeys = new Set(filtered.map((m) => `${m.metric_name}:${m.period_start}`));
  const syntheticFiltered = rollups
    .filter(
      (r) =>
        metricNames.some((n) => n.toLowerCase() === r.metric_name.toLowerCase()) &&
        !existingKeys.has(`${r.metric_name}:${r.period_start}`),
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

  // Add rollup values (only fill gaps)
  for (const r of syntheticFiltered) {
    if (!byPeriod.has(r.period_start)) {
      byPeriod.set(r.period_start, {});
    }
    const record = byPeriod.get(r.period_start)!;
    if (record[r.metric_name] == null) {
      record[r.metric_name] = r.value;
    }
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
  const dbPt = dbPeriodType(periodType);
  const filtered = metrics.filter(
    (m) =>
      metricNames.some((name) => name.toLowerCase() === m.metric_name.toLowerCase()) &&
      m.period_type === dbPt
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
  periodType: PeriodType,
  showAllMetrics?: boolean
) {
  const shouldShowAll = showAllMetrics || metricNames.length === 0;

  // Collect all unique metric names across ALL period types so metrics
  // appear consistently regardless of which period view is selected.
  const allMetricNames = new Set<string>();
  for (const m of metrics) {
    if (shouldShowAll || metricNames.some((n) => n.toLowerCase() === m.metric_name.toLowerCase())) {
      allMetricNames.add(m.metric_name);
    }
  }

  // Filter data to the selected period type only
  const dbPt = dbPeriodType(periodType);
  const filtered = metrics.filter((m) => {
    if (m.period_type !== dbPt) return false;
    if (shouldShowAll) return true;
    return metricNames.some(
      (name) => name.toLowerCase() === m.metric_name.toLowerCase()
    );
  });

  // Compute rollups and create synthetic MetricValue-like entries
  const rollups = computeRollups(metrics, periodType);
  const existingKeys = new Set(filtered.map((m) => `${m.metric_name}:${m.period_start}`));
  const syntheticMetrics = rollups
    .filter((r) => {
      if (existingKeys.has(`${r.metric_name}:${r.period_start}`)) return false;
      if (shouldShowAll) return true;
      return metricNames.some((n) => n.toLowerCase() === r.metric_name.toLowerCase());
    });

  // Build rollup detail lookup for tooltip display
  const rollupDetailMap = new Map<string, string>();
  for (const r of syntheticMetrics) {
    rollupDetailMap.set(`${r.metric_name}:${r.period_start}`, buildRollupDetail(r, metrics));
  }

  // Merge filtered + synthetic
  const mergedFiltered: MetricValue[] = [
    ...filtered,
    ...syntheticMetrics.map((r) => ({
      id: `rollup-${r.metric_name}-${r.period_start}`,
      metric_name: r.metric_name,
      period_type: dbPt as PeriodType,
      period_start: r.period_start,
      period_end: r.period_end,
      value: r.value,
      notes: null,
      submitted_at: "",
      updated_at: "",
      source: "rollup" as const,
    })),
  ];

  // Also ensure rollup metrics show in the names list
  for (const r of syntheticMetrics) {
    allMetricNames.add(r.metric_name);
  }

  // Group by metric name
  const byMetric = new Map<string, MetricValue[]>();
  for (const name of allMetricNames) {
    byMetric.set(name, []);
  }
  for (const metric of mergedFiltered) {
    byMetric.get(metric.metric_name)!.push(metric);
  }

  // Convert to table format
  return Array.from(byMetric.entries()).map(([metricName, values]) => {
    const sorted = values.sort(
      (a, b) =>
        new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
    );
    const latest = sorted[0];
    return {
      metricName,
      periodType,
      source: latest?.source,
      aiConfidence: latest?.ai_confidence,
      periods: sorted.map((v) => ({
        periodStart: v.period_start,
        periodEnd: v.period_end,
        value: getNumericValue(v.value),
        source: v.source,
        aiConfidence: v.ai_confidence,
        submittedAt: v.submitted_at,
        updatedAt: v.updated_at,
        rollupDetail: rollupDetailMap.get(`${v.metric_name}:${v.period_start}`),
      })),
    };
  });
}

function getLatestMetricValues(
  metrics: MetricValue[],
  metricName: string,
  periodType?: PeriodType
): { current: number | null; previous: number | null; currentPeriodStart: string | null; currentPeriodType: string | null } {
  let filtered = metrics.filter(
    (m) => m.metric_name.toLowerCase() === metricName.toLowerCase()
  );

  if (periodType) {
    const dbPt = dbPeriodType(periodType);
    filtered = filtered.filter((m) => m.period_type === dbPt);

    // Merge rollup values for metric cards
    const rollups = computeRollups(metrics, periodType);
    const existingKeys = new Set(filtered.map((m) => `${m.metric_name}:${m.period_start}`));
    const synthetic = rollups
      .filter(
        (r) =>
          r.metric_name.toLowerCase() === metricName.toLowerCase() &&
          !existingKeys.has(`${r.metric_name}:${r.period_start}`),
      )
      .map((r) => ({
        id: `rollup-${r.metric_name}-${r.period_start}`,
        metric_name: r.metric_name,
        period_type: dbPt as PeriodType,
        period_start: r.period_start,
        period_end: r.period_end,
        value: r.value,
        notes: null,
        submitted_at: "",
        updated_at: "",
        source: "rollup" as const,
      }));
    filtered = [...filtered, ...synthetic];
  }

  filtered.sort(
    (a, b) =>
      new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
  );

  return {
    current: filtered.length > 0 ? getNumericValue(filtered[0].value) : null,
    previous: filtered.length > 1 ? getNumericValue(filtered[1].value) : null,
    currentPeriodStart: filtered.length > 0 ? filtered[0].period_start : null,
    currentPeriodType: filtered.length > 0 ? filtered[0].period_type : null,
  };
}

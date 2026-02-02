export type ChartType = "line" | "bar" | "area" | "pie";
export type WidgetType = "chart" | "metric-card" | "table";
export type PeriodType = "monthly" | "quarterly" | "yearly";

export type ChartConfig = {
  chartType: ChartType;
  metrics: string[];
  periodType: PeriodType;
  showLegend: boolean;
  title?: string;
};

export type MetricCardConfig = {
  metric: string;
  showTrend: boolean;
  title?: string;
};

export type TableConfig = {
  metrics: string[];
  periodType: PeriodType;
  title?: string;
  showAllMetrics?: boolean;
};

export type Widget = {
  id: string;
  type: WidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: ChartConfig | MetricCardConfig | TableConfig;
};

export type DashboardLayout = {
  widgets: Widget[];
};

export type DashboardView = {
  id: string;
  investor_id: string;
  company_id: string;
  name: string;
  is_default: boolean;
  layout: DashboardLayout;
  created_at: string;
  updated_at: string;
};

export type DashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  target_industry: string | null;
  layout: DashboardLayout;
  is_system: boolean;
  created_at: string;
};

// Type guards
export function isChartConfig(config: unknown): config is ChartConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "chartType" in config &&
    "metrics" in config
  );
}

export function isMetricCardConfig(config: unknown): config is MetricCardConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "metric" in config &&
    "showTrend" in config
  );
}

export function isTableConfig(config: unknown): config is TableConfig {
  return (
    typeof config === "object" &&
    config !== null &&
    "metrics" in config &&
    !("chartType" in config) &&
    !("showTrend" in config)
  );
}

// Metric value from API
export type MetricValue = {
  id: string;
  metric_name: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  value: unknown;
  notes: string | null;
  submitted_at: string;
  updated_at: string;
};

// Extract numeric value from metric value
export function getNumericValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    // Handle { value: number } or { raw: string } format
    const v = (value as Record<string, unknown>).value ?? (value as Record<string, unknown>).raw;
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v) || null;
  }
  if (typeof value === "string") return parseFloat(value) || null;
  return null;
}

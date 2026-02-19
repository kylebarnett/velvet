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
  showTotals?: boolean;
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
  investor_id: string | null;
  founder_id?: string | null;
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

// Map widget width (1–12) to the exact Tailwind col-span class.
// All class names are string literals so Tailwind's content scanner picks them up.
const GRID_COL_SPANS: Record<number, string> = {
  1: "sm:col-span-1",
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  5: "sm:col-span-5",
  6: "sm:col-span-6",
  7: "sm:col-span-7",
  8: "sm:col-span-8",
  9: "sm:col-span-9",
  10: "sm:col-span-10",
  11: "sm:col-span-11",
  12: "sm:col-span-12",
};

export function getWidgetColSpanClass(w: number): string {
  const clamped = Math.max(1, Math.min(12, w));
  return GRID_COL_SPANS[clamped] ?? "sm:col-span-12";
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
  source?: string;
  ai_confidence?: number | null;
};

// Parse a layout from the DB (handles both array and { widgets } formats)
export function parseLayout(layout: unknown): Widget[] {
  let widgets: Widget[] = [];
  if (!layout) return widgets;
  if (Array.isArray(layout)) {
    widgets = layout as Widget[];
  } else if (typeof layout === "object" && layout !== null && "widgets" in layout) {
    widgets = (layout as DashboardLayout).widgets;
  }
  // Ensure all table widgets have showAllMetrics so they cannot be deleted
  return widgets.map((w) => {
    if (w.type === "table" && w.config && typeof w.config === "object") {
      return { ...w, config: { ...w.config, showAllMetrics: true } };
    }
    return w;
  });
}

// Ensure a metrics table exists without reordering positions (for saved views)
export function ensureMetricsTable(widgets: Widget[]): Widget[] {
  const hasTable = widgets.some((w) => w.type === "table");
  if (hasTable) return widgets;

  const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);
  return [
    ...widgets,
    {
      id: "table-all",
      type: "table" as const,
      x: 0,
      y: maxY,
      w: 12,
      h: 3,
      config: {
        metrics: [],
        periodType: "quarterly" as const,
        title: "All Metrics",
        showAllMetrics: true,
      },
    },
  ];
}

// Re-export canonical numeric value extraction from shared utility
export { getNumericValue } from "@/lib/metrics/numeric-value";

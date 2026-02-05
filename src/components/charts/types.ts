export type MetricDataPoint = {
  period: string;
  periodStart: string;
  periodEnd: string;
  [metricName: string]: string | number | null;
};

export type ChartProps = {
  data: MetricDataPoint[];
  metrics: string[];
  title?: string;
  showLegend?: boolean;
  height?: number;
};

// Color palette for chart lines/bars (matches dark theme)
export const CHART_COLORS = [
  "#3b82f6", // blue-500
  "#10b981", // emerald-500
  "#f59e0b", // amber-500
  "#ef4444", // red-500
  "#8b5cf6", // violet-500
  "#ec4899", // pink-500
  "#06b6d4", // cyan-500
  "#84cc16", // lime-500
];

export function getChartColor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}

// Format number with commas for thousands
// If value is a whole number (no cents), omit decimals
function formatWithCommas(value: number): string {
  const hasDecimals = value % 1 !== 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

// Format values for display - shows full numbers, decimals only when needed
export function formatValue(value: number | null | undefined, metricName?: string): string {
  if (value == null) return "-";

  const lowerName = metricName?.toLowerCase() ?? "";

  // Percentage metrics
  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn") ||
    lowerName.includes("conversion")
  ) {
    return `${formatWithCommas(value)}%`;
  }

  // Currency/revenue metrics - show full value with $
  if (
    lowerName.includes("revenue") ||
    lowerName.includes("mrr") ||
    lowerName.includes("arr") ||
    lowerName.includes("cac") ||
    lowerName.includes("ltv") ||
    lowerName.includes("burn") ||
    lowerName.includes("cost") ||
    lowerName.includes("expense") ||
    lowerName.includes("gmv") ||
    lowerName.includes("aov") ||
    lowerName.includes("arpu")
  ) {
    return `$${formatWithCommas(value)}`;
  }

  // Default - show with commas, decimals only if needed
  return formatWithCommas(value);
}

// Format period for display
export function formatPeriod(periodStart: string, periodType: string): string {
  const date = new Date(periodStart);

  if (periodType === "monthly") {
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }

  if (periodType === "quarterly") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    const year = date.getFullYear().toString().slice(-2);
    return `Q${quarter} '${year}`;
  }

  if (periodType === "yearly") {
    return date.getFullYear().toString();
  }

  return periodStart;
}

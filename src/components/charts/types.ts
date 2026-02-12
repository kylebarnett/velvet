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

  // Currency metrics (check before percentage — "Burn Rate" is currency, not %)
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

  // Default - show with commas, decimals only if needed
  return formatWithCommas(value);
}

// Format period for display.
// Uses UTC methods — date-only strings like "2023-10-01" parse as midnight UTC.
// Local-time getMonth() shifts the result in timezones behind UTC
// (e.g. Oct 1 UTC → Sep 30 PST → Q3 instead of Q4).
export function formatPeriod(periodStart: string, periodType: string): string {
  const date = new Date(periodStart);

  if (periodType === "monthly") {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const year = date.getUTCFullYear().toString().slice(-2);
    return `${monthNames[date.getUTCMonth()]} '${year}`;
  }

  if (periodType === "quarterly") {
    const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
    const year = date.getUTCFullYear().toString().slice(-2);
    return `Q${quarter} '${year}`;
  }

  if (periodType === "yearly") {
    return date.getUTCFullYear().toString();
  }

  return periodStart;
}

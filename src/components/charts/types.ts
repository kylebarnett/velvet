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

function formatWithCommas(value: number): string {
  const hasDecimals = value % 1 !== 0;
  return value.toLocaleString("en-US", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  });
}

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

  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn") ||
    lowerName.includes("conversion")
  ) {
    return `${formatWithCommas(value)}%`;
  }

  return formatWithCommas(value);
}

// Currency checks BEFORE percentage (Burn Rate contains both "burn" and "rate")
function inferMetricType(metricName?: string): "currency" | "percentage" | "number" {
  const lowerName = metricName?.toLowerCase() ?? "";

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
    return "currency";
  }

  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn") ||
    lowerName.includes("conversion")
  ) {
    return "percentage";
  }

  return "number";
}

export function formatCompactValue(value: number | null | undefined, metricName?: string): string {
  if (value == null) return "-";

  const type = inferMetricType(metricName);
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";

  function compact(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
    return v % 1 !== 0 ? v.toFixed(1) : v.toString();
  }

  if (type === "currency") return `${sign}$${compact(abs)}`;
  if (type === "percentage") return `${sign}${compact(abs)}%`;
  return `${sign}${compact(abs)}`;
}

// Uses UTC methods because date-only strings parse as midnight UTC.
// Local-time getMonth() would shift in timezones behind UTC
// (e.g. Oct 1 UTC -> Sep 30 PST -> Q3 instead of Q4).
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

  if (periodType === "yearly" || periodType === "annual") {
    return date.getUTCFullYear().toString();
  }

  return periodStart;
}

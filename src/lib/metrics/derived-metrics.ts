import type { MetricValue } from "@/components/dashboard";

/**
 * Extract numeric value from a metric value entry.
 * Handles both { raw: "123" } JSONB format and plain numbers/strings.
 */
function extractNumber(val: MetricValue["value"]): number | null {
  if (val == null) return null;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val);
    return isNaN(n) ? null : n;
  }
  if (typeof val === "object") {
    const raw = (val as Record<string, unknown>).raw ?? (val as Record<string, unknown>).value;
    if (raw == null) return null;
    const n = parseFloat(String(raw));
    return isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Get the latest value for a given metric name.
 * Matches case-insensitively and returns the most recent period's value.
 */
function getLatestValue(metrics: MetricValue[], metricName: string): number | null {
  const lower = metricName.toLowerCase();
  const matching = metrics
    .filter((m) => m.metric_name.toLowerCase() === lower)
    .sort((a, b) => b.period_start.localeCompare(a.period_start));

  if (matching.length === 0) return null;
  return extractNumber(matching[0].value);
}

export type RunwayResult = {
  months: number;
  cashBalance: number;
  burnRate: number;
  urgency: "critical" | "warning" | "healthy";
};

export type RunwayMissing = {
  missing: ("Cash Balance" | "Burn Rate")[];
};

/**
 * Compute runway in months from Cash Balance and Burn Rate metrics.
 * Returns which metrics are missing if calculation isn't possible.
 */
export function computeRunway(metrics: MetricValue[]): RunwayResult | RunwayMissing {
  const cashBalance = getLatestValue(metrics, "Cash Balance");
  const burnRate = getLatestValue(metrics, "Burn Rate");

  if (cashBalance == null || burnRate == null || burnRate <= 0) {
    const missing: ("Cash Balance" | "Burn Rate")[] = [];
    if (cashBalance == null) missing.push("Cash Balance");
    if (burnRate == null || burnRate <= 0) missing.push("Burn Rate");
    return { missing };
  }

  const months = cashBalance / burnRate;

  let urgency: RunwayResult["urgency"] = "healthy";
  if (months < 6) urgency = "critical";
  else if (months < 12) urgency = "warning";

  return { months, cashBalance, burnRate, urgency };
}

export type PeriodDelta = {
  metricName: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
  changeAbsolute: number;
  isPositive: boolean;
};

/**
 * Compute period-over-period delta for a given metric.
 * Returns the most recent period compared to the one before it.
 */
export function computePeriodDelta(
  metrics: MetricValue[],
  metricName: string,
): PeriodDelta | null {
  const lower = metricName.toLowerCase();
  const matching = metrics
    .filter((m) => m.metric_name.toLowerCase() === lower)
    .sort((a, b) => b.period_start.localeCompare(a.period_start));

  if (matching.length < 2) return null;

  const currentVal = extractNumber(matching[0].value);
  const previousVal = extractNumber(matching[1].value);

  if (currentVal == null || previousVal == null || previousVal === 0) return null;

  const changePercent = ((currentVal - previousVal) / Math.abs(previousVal)) * 100;
  const changeAbsolute = currentVal - previousVal;

  // For burn rate / expenses, negative change is positive
  const negativeBetter = lower.includes("burn") || lower.includes("churn") || lower.includes("cost") || lower.includes("expense");
  const isPositive = negativeBetter ? changePercent < 0 : changePercent > 0;

  return {
    metricName,
    currentValue: currentVal,
    previousValue: previousVal,
    changePercent,
    changeAbsolute,
    isPositive,
  };
}

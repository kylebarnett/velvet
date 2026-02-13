import { extractNumericValue } from "@/lib/reports/aggregation";
import { inferMetricValueType } from "@/lib/metric-definitions";

// --- Types ---

export type RawMetric = {
  metric_name: string;
  period_type: string;
  period_start: string;
  value: { raw?: string } | string | number;
};

export type DeltaResult = {
  absolute: number;
  percent: number | null; // null if previousValue is 0
  direction: "up" | "down" | "flat";
};

export type AnomalyResult = {
  isAnomaly: boolean;
  message: string | null;
  severity: "warning" | null;
};

export type ReportCardItem = {
  metricName: string;
  newValue: number;
  previousValue: number | null;
  deltaPercent: number | null;
  direction: "up" | "down" | "flat";
};

export type ReportCard = {
  totalSubmitted: number;
  items: ReportCardItem[];
  biggestGain: ReportCardItem | null;
  biggestDecline: ReportCardItem | null;
};

// --- Sparkline data ---

export function getSparklineValues(
  rawMetrics: RawMetric[],
  metricName: string,
  periodType: string,
  count = 6,
): number[] {
  const lowerName = metricName.toLowerCase();
  const matching = rawMetrics
    .filter(
      (m) =>
        m.metric_name.toLowerCase() === lowerName &&
        m.period_type === periodType,
    )
    .sort((a, b) => a.period_start.localeCompare(b.period_start));

  const nums: number[] = [];
  for (const m of matching) {
    const n = extractNumericValue(m.value);
    if (n !== null) nums.push(n);
  }

  return nums.slice(-count);
}

/**
 * Get the most recent value for a metric before a given period start date.
 */
export function getPreviousValue(
  rawMetrics: RawMetric[],
  metricName: string,
  periodType: string,
  currentPeriodStart: string,
): number | null {
  const lowerName = metricName.toLowerCase();
  const prior = rawMetrics
    .filter(
      (m) =>
        m.metric_name.toLowerCase() === lowerName &&
        m.period_type === periodType &&
        m.period_start < currentPeriodStart,
    )
    .sort((a, b) => b.period_start.localeCompare(a.period_start));

  if (prior.length === 0) return null;
  return extractNumericValue(prior[0].value);
}

// --- Delta calculation ---

export function computeDelta(
  newValue: number,
  previousValue: number,
): DeltaResult {
  const absolute = newValue - previousValue;
  const percent =
    previousValue === 0
      ? null
      : ((newValue - previousValue) / Math.abs(previousValue)) * 100;
  const direction: DeltaResult["direction"] =
    absolute > 0 ? "up" : absolute < 0 ? "down" : "flat";
  return { absolute, percent, direction };
}

// --- Anomaly detection ---

export function detectAnomaly(
  enteredValue: number,
  historicalValues: number[],
): AnomalyResult {
  const none: AnomalyResult = { isAnomaly: false, message: null, severity: null };
  if (historicalValues.length < 3) return none;

  const mean =
    historicalValues.reduce((s, v) => s + v, 0) / historicalValues.length;
  const variance =
    historicalValues.reduce((s, v) => s + (v - mean) ** 2, 0) /
    historicalValues.length;
  const stddev = Math.sqrt(variance);

  // Avoid false positives when values are nearly constant
  if (stddev < 0.01) {
    if (Math.abs(enteredValue - mean) < 0.01) return none;
  }

  const deviation = Math.abs(enteredValue - mean);
  if (deviation <= 2 * stddev) return none;

  // Human-readable message
  const formattedMean = formatCompact(mean);
  const direction = enteredValue > mean ? "higher" : "lower";

  return {
    isAnomaly: true,
    message: `Significantly ${direction} than recent avg ${formattedMean}`,
    severity: "warning",
  };
}

function formatCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs < 1) return value.toFixed(2);
  return value.toFixed(0);
}

// --- Report card ---

export function buildReportCard(
  submissions: Array<{ metricName: string; value: string }>,
  rawMetrics: RawMetric[],
  periodType: string,
  currentPeriodStart: string,
): ReportCard {
  const items: ReportCardItem[] = [];

  for (const sub of submissions) {
    const newValue = parseFloat(sub.value);
    if (isNaN(newValue)) continue;

    const prevValue = getPreviousValue(
      rawMetrics,
      sub.metricName,
      periodType,
      currentPeriodStart,
    );

    if (prevValue !== null) {
      const delta = computeDelta(newValue, prevValue);
      items.push({
        metricName: sub.metricName,
        newValue,
        previousValue: prevValue,
        deltaPercent: delta.percent,
        direction: delta.direction,
      });
    } else {
      items.push({
        metricName: sub.metricName,
        newValue,
        previousValue: null,
        deltaPercent: null,
        direction: "flat",
      });
    }
  }

  let biggestGain: ReportCardItem | null = null;
  let biggestDecline: ReportCardItem | null = null;

  for (const item of items) {
    if (item.deltaPercent === null) continue;
    if (
      item.deltaPercent > 0 &&
      (biggestGain === null || item.deltaPercent > (biggestGain.deltaPercent ?? 0))
    ) {
      biggestGain = item;
    }
    if (
      item.deltaPercent < 0 &&
      (biggestDecline === null ||
        item.deltaPercent < (biggestDecline.deltaPercent ?? 0))
    ) {
      biggestDecline = item;
    }
  }

  return {
    totalSubmitted: items.length,
    items,
    biggestGain,
    biggestDecline,
  };
}

/**
 * Format a report card value using the metric's inferred type.
 */
export function formatReportValue(metricName: string, value: number): string {
  const valueType = inferMetricValueType(metricName);
  if (valueType === "currency") {
    if (Math.abs(value) >= 1_000_000)
      return `$${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `$${Math.round(value / 1_000)}K`;
    return `$${value.toFixed(0)}`;
  }
  if (valueType === "percent") return `${value.toFixed(1)}%`;
  if (valueType === "ratio") return value.toFixed(2);
  return value.toLocaleString();
}

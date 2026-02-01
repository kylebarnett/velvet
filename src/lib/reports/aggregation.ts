// Metric aggregation utilities for portfolio reports

// Metrics that can be summed across portfolio (absolute values)
export const SUMMABLE_METRICS = new Set([
  "revenue",
  "net revenue",
  "arr",
  "mrr",
  "burn rate",
  "headcount",
  "gmv",
  "total transaction volume",
  "operating expenses",
  "customer count",
  "monthly active users",
  "monthly active learners",
  "monthly active patients",
  "active accounts",
  "api calls",
  "data processing volume",
]);

// Metrics that should only be averaged (percentages, ratios)
export const AVERAGE_ONLY_METRICS = new Set([
  "gross margin",
  "net revenue retention",
  "nrr",
  "gross revenue retention",
  "customer churn rate",
  "churn rate",
  "conversion rate",
  "return rate",
  "cart abandonment rate",
  "take rate",
  "default rate",
  "fraud rate",
  "retention rate",
  "patient retention rate",
  "student retention rate",
  "course completion rate",
  "model accuracy",
  "nps",
  "hipaa compliance score",
]);

// Metrics where median is more meaningful than mean
export const MEDIAN_PREFERRED_METRICS = new Set([
  "runway",
  "cac",
  "ltv",
  "ltv:cac ratio",
  "aov",
  "arpu",
  "inference latency",
  "claims processing time",
]);

export type AggregatedMetric = {
  sum: number | null;
  average: number;
  median: number;
  min: number;
  max: number;
  count: number;
  values: number[];
};

export type MetricAggregates = Record<string, AggregatedMetric>;

/**
 * Check if a metric can be summed for portfolio total
 */
export function canSumMetric(metricName: string): boolean {
  const normalized = metricName.toLowerCase().trim();
  return SUMMABLE_METRICS.has(normalized);
}

/**
 * Check if a metric should prefer median over mean
 */
export function prefersMedian(metricName: string): boolean {
  const normalized = metricName.toLowerCase().trim();
  return MEDIAN_PREFERRED_METRICS.has(normalized);
}

/**
 * Calculate median of an array of numbers
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Aggregate multiple values for a single metric
 */
export function aggregateMetricValues(values: number[]): AggregatedMetric {
  if (values.length === 0) {
    return {
      sum: null,
      average: 0,
      median: 0,
      min: 0,
      max: 0,
      count: 0,
      values: [],
    };
  }

  const sum = values.reduce((acc, v) => acc + v, 0);
  const average = sum / values.length;
  const median = calculateMedian(values);
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    sum,
    average,
    median,
    min,
    max,
    count: values.length,
    values,
  };
}

/**
 * Extract numeric value from metric value (handles various formats)
 */
export function extractNumericValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    const v = (value as Record<string, unknown>).value;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const parsed = parseFloat(v);
      return isNaN(parsed) ? null : parsed;
    }
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  }
  return null;
}

/**
 * Calculate growth rate between two values
 */
export function calculateGrowthRate(
  currentValue: number,
  previousValue: number
): number | null {
  if (previousValue === 0) return null;
  return ((currentValue - previousValue) / Math.abs(previousValue)) * 100;
}

/**
 * Normalize value to an index starting at 100
 */
export function normalizeToIndex(
  currentValue: number,
  baseValue: number
): number {
  if (baseValue === 0) return 0;
  return (currentValue / baseValue) * 100;
}

/**
 * Calculate weighted average (useful for percentage metrics weighted by revenue)
 */
export function calculateWeightedAverage(
  values: Array<{ value: number; weight: number }>
): number {
  const totalWeight = values.reduce((acc, v) => acc + v.weight, 0);
  if (totalWeight === 0) return 0;
  return (
    values.reduce((acc, v) => acc + v.value * v.weight, 0) / totalWeight
  );
}

/**
 * Format period key for aggregation grouping
 */
export function formatPeriodKey(periodStart: string, periodType: string): string {
  const date = new Date(periodStart);

  if (periodType === "monthly") {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  if (periodType === "quarterly") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `${date.getFullYear()}-Q${quarter}`;
  }

  if (periodType === "yearly") {
    return String(date.getFullYear());
  }

  return periodStart;
}

/**
 * Get display label for a period
 */
export function formatPeriodLabel(periodKey: string, periodType: string): string {
  if (periodType === "quarterly") {
    const [year, quarter] = periodKey.split("-Q");
    return `Q${quarter} '${year.slice(-2)}`;
  }

  if (periodType === "monthly") {
    const [year, month] = periodKey.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  }

  return periodKey;
}

/**
 * Identify the primary revenue-like metric for a company
 */
export const REVENUE_PRIORITY = [
  "mrr",
  "arr",
  "revenue",
  "net revenue",
  "gmv",
  "total transaction volume",
];

export function identifyRevenueMetric(metricNames: string[]): string | null {
  const normalized = metricNames.map((n) => n.toLowerCase().trim());
  for (const priority of REVENUE_PRIORITY) {
    const match = normalized.find((n) => n === priority);
    if (match) return metricNames[normalized.indexOf(match)];
  }
  return null;
}

/**
 * Calculate portfolio coverage (how many companies have this metric)
 */
export function calculateCoverage(
  metricCount: number,
  totalCompanies: number
): { count: number; total: number; percentage: number } {
  return {
    count: metricCount,
    total: totalCompanies,
    percentage: totalCompanies > 0 ? (metricCount / totalCompanies) * 100 : 0,
  };
}

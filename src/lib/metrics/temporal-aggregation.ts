/**
 * Temporal Aggregation Logic for Metric Totals
 *
 * Implements TTM-style (Trailing Twelve Month) rolling aggregations
 * for the metrics table "Total" column.
 *
 * Two types of temporal aggregation:
 * 1. Flow Metrics (sum): Cumulative values earned/spent over periods (e.g., Revenue)
 * 2. Point-in-Time Metrics (latest): Snapshots at a specific moment (e.g., ARR, Headcount)
 */

export type AggregationType = "sum" | "latest";

/**
 * Flow metrics that should be summed across time periods.
 * These represent cumulative values earned/spent over a period.
 */
export const FLOW_METRICS = new Set([
  "revenue",
  "net revenue",
  "gmv",
  "gross merchandise volume",
  "total transaction volume",
  "transaction volume",
  "operating expenses",
  "opex",
  "r&d spend",
  "r&d expenses",
  "research and development",
  "marketing spend",
  "marketing expenses",
  "sales expenses",
  "sales spend",
  "cost of goods sold",
  "cogs",
  "api calls",
  "data processing volume",
  "total sales",
  "gross sales",
  "net sales",
  "operating costs",
  "total expenses",
  "payroll expenses",
  "infrastructure costs",
  "cloud costs",
  "hosting costs",
]);

/**
 * Point-in-time metrics that show the most recent value.
 * These represent snapshots, rates, or counts at a specific moment.
 */
export const POINT_IN_TIME_METRICS = new Set([
  // Recurring revenue rates
  "arr",
  "annual recurring revenue",
  "mrr",
  "monthly recurring revenue",
  // Burn rates (current rate, not cumulative)
  "net burn rate",
  "gross burn rate",
  "burn rate",
  "net burn",
  "gross burn",
  // Counts
  "customer count",
  "customers",
  "headcount",
  "employees",
  "active accounts",
  // Active users
  "monthly active users",
  "mau",
  "active users",
  "monthly active learners",
  "monthly active patients",
  "daily active users",
  "dau",
  // Financial snapshots
  "runway",
  "cash on hand",
  "cash balance",
  // Percentages / Rates
  "gross margin",
  "net margin",
  "net revenue retention",
  "nrr",
  "gross revenue retention",
  "grr",
  "churn rate",
  "customer churn rate",
  "retention rate",
  "conversion rate",
  "default rate",
  "fraud rate",
  "take rate",
  "return rate",
  "cart abandonment rate",
  "repeat purchase rate",
  "course completion rate",
  "patient retention rate",
  "provider utilization rate",
  "student retention rate",
  // Ratios and per-unit metrics
  "ltv",
  "lifetime value",
  "cac",
  "customer acquisition cost",
  "ltv:cac ratio",
  "ltv:cac",
  "arpu",
  "average revenue per user",
  "aov",
  "average order value",
  "cost per patient",
  // Scores and satisfaction
  "nps",
  "net promoter score",
  "clinical outcomes score",
  "hipaa compliance score",
  "instructor satisfaction",
  "learning outcome improvement",
  // Performance metrics
  "model accuracy",
  "inference latency",
  "claims processing time",
  "content engagement time",
  "inventory turnover",
  // Growth rates (point-in-time measurements)
  "usage growth rate",
  "regulatory capital ratio",
  "net interest margin",
  "compute costs",
]);

/**
 * Get the default aggregation type for a metric based on its name.
 * Uses exact matching against known metric sets.
 */
export function getDefaultAggregationType(metricName: string): AggregationType {
  const normalized = metricName.toLowerCase().trim();
  if (FLOW_METRICS.has(normalized)) return "sum";
  return "latest"; // Default to point-in-time for safety
}

/**
 * Recommend an aggregation type for a metric with confidence level.
 * Used when creating new metrics to help users choose the right type.
 */
export function recommendAggregationType(metricName: string): {
  recommended: AggregationType;
  confidence: "high" | "medium" | "low";
  reason: string;
} {
  const normalized = metricName.toLowerCase().trim();

  // High confidence: exact matches in known sets
  if (FLOW_METRICS.has(normalized)) {
    return {
      recommended: "sum",
      confidence: "high",
      reason: "Known flow metric - represents cumulative value over time",
    };
  }
  if (POINT_IN_TIME_METRICS.has(normalized)) {
    return {
      recommended: "latest",
      confidence: "high",
      reason: "Known point-in-time metric - represents a snapshot value",
    };
  }

  // Medium confidence: pattern matching for flow metrics
  if (/\b(revenue|sales|income)\b/i.test(normalized) && !/recurring|arr|mrr/i.test(normalized)) {
    return {
      recommended: "sum",
      confidence: "medium",
      reason: "Appears to be a revenue/sales metric (flow)",
    };
  }
  if (/\b(spend|expense|cost|cogs)\b/i.test(normalized) && !/per\s|acquisition/i.test(normalized)) {
    return {
      recommended: "sum",
      confidence: "medium",
      reason: "Appears to be an expense metric (flow)",
    };
  }
  if (/\b(volume|calls|transactions)\b/i.test(normalized)) {
    return {
      recommended: "sum",
      confidence: "medium",
      reason: "Appears to be a volume metric (flow)",
    };
  }

  // Medium confidence: pattern matching for point-in-time metrics
  if (/\b(rate|ratio|margin|%|percentage)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a rate or percentage (point-in-time)",
    };
  }
  if (/\b(count|headcount|employees|users|customers|accounts)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a count metric (point-in-time)",
    };
  }
  if (/\b(runway|balance|cash)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a balance metric (point-in-time)",
    };
  }
  if (/\b(arr|mrr|recurring)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a recurring revenue rate (point-in-time)",
    };
  }
  if (/\b(burn)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a burn rate (point-in-time)",
    };
  }
  if (/\b(score|nps|satisfaction)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a score metric (point-in-time)",
    };
  }
  if (/\b(ltv|cac|arpu|aov)\b/i.test(normalized)) {
    return {
      recommended: "latest",
      confidence: "medium",
      reason: "Appears to be a per-unit metric (point-in-time)",
    };
  }

  // Low confidence: unknown metric, default to latest (safer)
  return {
    recommended: "latest",
    confidence: "low",
    reason: "Unknown metric type - defaulting to point-in-time (safer)",
  };
}

/**
 * Calculate the rolling total for a set of values based on aggregation type.
 *
 * @param values - Array of values (null for missing data), in chronological order (oldest first)
 * @param aggregationType - "sum" for flow metrics, "latest" for point-in-time
 * @returns The calculated total, or null if no valid data
 */
export function calculateRollingTotal(
  values: (number | null)[],
  aggregationType: AggregationType
): number | null {
  // Filter out null values
  const validValues = values.filter((v): v is number => v !== null);

  if (validValues.length === 0) {
    return null;
  }

  if (aggregationType === "sum") {
    // Sum all valid values for flow metrics
    return validValues.reduce((sum, val) => sum + val, 0);
  }

  // For "latest", return the last non-null value (most recent)
  // Values are expected to be in chronological order (oldest first)
  return validValues[validValues.length - 1];
}

/**
 * Get the display label for the total column based on period type.
 */
export function getTotalColumnLabel(_periodType: string, _periodsVisible: number): string {
  return "Total";
}

/**
 * Get the indicator symbol for the aggregation type.
 * Used in the UI to show how the total was calculated.
 */
export function getAggregationIndicator(aggregationType: AggregationType): {
  symbol: string;
  label: string;
} {
  if (aggregationType === "sum") {
    return { symbol: "Σ", label: "Sum of visible periods" };
  }
  return { symbol: "●", label: "Most recent value" };
}

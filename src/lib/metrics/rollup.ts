/**
 * Metric Rollups — compute quarterly values from monthly data,
 * and annual values from quarterly (or monthly) data.
 *
 * Pure utility — no React, no DB calls. All computation is client-side
 * from the already-fetched metrics array.
 *
 * Rollup strategy depends on metric type:
 * - Flow metrics (Revenue, Expenses): SUM child periods (all must be present)
 * - Point-in-time metrics (Cash Balance, MRR): LATEST child period value
 *
 * Founder-submitted values always win; rollups only fill empty cells.
 */

import { getDefaultAggregationType, type AggregationType } from "./temporal-aggregation";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RolledUpValue = {
  metric_name: string;
  period_type: string; // target: "quarterly" or "annual"
  period_start: string; // e.g. "2025-01-01" for Q1
  period_end: string; // e.g. "2025-03-31" for Q1
  value: number;
  source: "rollup";
  aggregationType: AggregationType;
  childCount: number; // how many child periods contributed
  expectedChildCount: number; // 3 for quarter-from-months, 4 for annual-from-quarters, 12 for annual-from-months
};

/** Minimal shape needed from the metrics array */
type MetricInput = {
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
};

type PeriodType = "monthly" | "quarterly" | "yearly";

// ---------------------------------------------------------------------------
// Date helpers — all UTC per project convention
// ---------------------------------------------------------------------------

function utcYear(d: Date): number {
  return d.getUTCFullYear();
}
function utcMonth(d: Date): number {
  return d.getUTCMonth();
}

/** Format YYYY-MM-DD from UTC components */
function isoDate(year: number, month: number, day: number): string {
  const mm = String(month + 1).padStart(2, "0");
  const dd = String(day).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

/** Map a monthly period_start to its quarter's period_start */
function monthToQuarterStart(periodStart: string): string {
  const d = new Date(periodStart);
  const qMonth = Math.floor(utcMonth(d) / 3) * 3;
  return isoDate(utcYear(d), qMonth, 1);
}

/** Map a period_start to its year's annual period_start */
function toAnnualStart(periodStart: string): string {
  const d = new Date(periodStart);
  return isoDate(utcYear(d), 0, 1);
}

/** Get the period_end for a quarter given its start */
function quarterEnd(quarterStart: string): string {
  const d = new Date(quarterStart);
  const qMonth = utcMonth(d);
  // Last day of the quarter's last month
  // qMonth is 0,3,6,9 → last month is qMonth+2
  // Last day: create next month day 0
  const lastDay = new Date(Date.UTC(utcYear(d), qMonth + 3, 0)).getUTCDate();
  return isoDate(utcYear(d), qMonth + 2, lastDay);
}

/** Get the period_end for an annual period given its start */
function annualEnd(annualStart: string): string {
  const d = new Date(annualStart);
  return isoDate(utcYear(d), 11, 31);
}

/**
 * For point-in-time "latest" aggregation, determine the last child
 * period_start within the target range.
 *
 * Monthly → Quarterly: last month of the quarter (qMonth + 2)
 * Quarterly → Annual: Q4 start (Oct 1)
 * Monthly → Annual: Dec (month 11)
 */
function lastChildPeriodStart(
  targetStart: string,
  sourceType: "monthly" | "quarterly",
  targetType: "quarterly" | "annual",
): string {
  const d = new Date(targetStart);
  if (targetType === "quarterly" && sourceType === "monthly") {
    // Last month of quarter: qMonth+2
    const qMonth = utcMonth(d);
    return isoDate(utcYear(d), qMonth + 2, 1);
  }
  if (targetType === "annual" && sourceType === "quarterly") {
    // Q4 start: Oct 1
    return isoDate(utcYear(d), 9, 1);
  }
  if (targetType === "annual" && sourceType === "monthly") {
    // December
    return isoDate(utcYear(d), 11, 1);
  }
  return targetStart;
}

/** Short month names for rollup detail strings */
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Format a period_start for display in rollup detail. */
function formatChildPeriod(periodStart: string, sourceType: "monthly" | "quarterly"): string {
  const d = new Date(periodStart);
  const yr = String(utcYear(d)).slice(-2);
  if (sourceType === "monthly") {
    return `${MONTH_NAMES[utcMonth(d)]} '${yr}`;
  }
  // quarterly
  const q = Math.floor(utcMonth(d) / 3) + 1;
  return `Q${q} '${yr}`;
}

// ---------------------------------------------------------------------------
// Numeric extraction (inline to avoid import cycles)
// ---------------------------------------------------------------------------

function extractNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    const v = (value as Record<string, unknown>).value ?? (value as Record<string, unknown>).raw;
    if (typeof v === "number") return v;
    if (typeof v === "string") {
      const n = parseFloat(v);
      return isNaN(n) ? null : n;
    }
  }
  if (typeof value === "string") {
    const n = parseFloat(value);
    return isNaN(n) ? null : n;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Compute rolled-up metric values for a target period type.
 *
 * @param metrics - All metric values available (all period types)
 * @param targetPeriodType - "quarterly" or "yearly" (UI naming)
 * @returns Array of synthetic rolled-up values to fill gaps
 */
export function computeRollups(
  metrics: MetricInput[],
  targetPeriodType: PeriodType,
): RolledUpValue[] {
  // Nothing rolls up to monthly
  if (targetPeriodType === "monthly") return [];

  // DB stores "annual" but UI uses "yearly"
  const dbTarget = targetPeriodType === "yearly" ? "annual" : targetPeriodType;

  // Build set of existing submitted values at the target level
  const existingKeys = new Set<string>();
  for (const m of metrics) {
    if (m.period_type === dbTarget) {
      existingKeys.add(`${m.metric_name}:${m.period_start}`);
    }
  }

  // Collect source metrics (monthly for quarterly target, quarterly/monthly for annual)
  const monthlyMetrics = metrics.filter((m) => m.period_type === "monthly");
  const quarterlyMetrics = metrics.filter((m) => m.period_type === "quarterly");

  if (dbTarget === "quarterly") {
    return rollupFromSource(monthlyMetrics, "monthly", "quarterly", existingKeys, 3);
  }

  // Annual: per-metric, prefer quarterly if available, else monthly
  // Group all metrics by name to decide source per metric
  const metricNames = new Set<string>();
  for (const m of monthlyMetrics) metricNames.add(m.metric_name);
  for (const m of quarterlyMetrics) metricNames.add(m.metric_name);

  const results: RolledUpValue[] = [];

  for (const name of metricNames) {
    const hasQuarterly = quarterlyMetrics.some((m) => m.metric_name === name);
    if (hasQuarterly) {
      const source = quarterlyMetrics.filter((m) => m.metric_name === name);
      results.push(...rollupFromSource(source, "quarterly", "annual", existingKeys, 4));
    } else {
      const source = monthlyMetrics.filter((m) => m.metric_name === name);
      results.push(...rollupFromSource(source, "monthly", "annual", existingKeys, 12));
    }
  }

  return results;
}

/**
 * Compute rollups from a single source type to a single target type.
 */
function rollupFromSource(
  sourceMetrics: MetricInput[],
  sourceType: "monthly" | "quarterly",
  targetType: "quarterly" | "annual",
  existingKeys: Set<string>,
  expectedChildCount: number,
): RolledUpValue[] {
  // Group source metrics by (metric_name, target_period_start)
  const groups = new Map<string, { values: Map<string, number>; metricName: string; targetStart: string }>();

  for (const m of sourceMetrics) {
    const num = extractNumber(m.value);
    if (num === null) continue;

    const targetStart =
      targetType === "quarterly"
        ? monthToQuarterStart(m.period_start)
        : toAnnualStart(m.period_start);

    const key = `${m.metric_name}:${targetStart}`;

    // Skip if a submitted value already exists at this target
    if (existingKeys.has(key)) continue;

    if (!groups.has(key)) {
      groups.set(key, { values: new Map(), metricName: m.metric_name, targetStart });
    }
    groups.get(key)!.values.set(m.period_start, num);
  }

  const results: RolledUpValue[] = [];

  for (const [, group] of groups) {
    const aggType = getDefaultAggregationType(group.metricName);

    if (aggType === "sum") {
      // ALL child periods must be present
      if (group.values.size < expectedChildCount) continue;

      let sum = 0;
      for (const v of group.values.values()) sum += v;

      results.push({
        metric_name: group.metricName,
        period_type: targetType,
        period_start: group.targetStart,
        period_end: targetType === "quarterly" ? quarterEnd(group.targetStart) : annualEnd(group.targetStart),
        value: sum,
        source: "rollup",
        aggregationType: "sum",
        childCount: group.values.size,
        expectedChildCount,
      });
    } else {
      // "latest": only need the last child period
      const lastStart = lastChildPeriodStart(group.targetStart, sourceType, targetType);
      const lastValue = group.values.get(lastStart);
      if (lastValue === undefined) continue;

      results.push({
        metric_name: group.metricName,
        period_type: targetType,
        period_start: group.targetStart,
        period_end: targetType === "quarterly" ? quarterEnd(group.targetStart) : annualEnd(group.targetStart),
        value: lastValue,
        source: "rollup",
        aggregationType: "latest",
        childCount: 1,
        expectedChildCount,
      });
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Detail string generator — for tooltip display
// ---------------------------------------------------------------------------

/**
 * Build a human-readable detail string for a rollup.
 * e.g. "Sum of Jan, Feb, Mar '25" or "Latest: Mar '25"
 */
export function buildRollupDetail(rollup: RolledUpValue, sourceMetrics: MetricInput[]): string {
  // Determine source type from the target
  const sourceType: "monthly" | "quarterly" =
    rollup.period_type === "quarterly"
      ? "monthly"
      : rollup.expectedChildCount === 4
        ? "quarterly"
        : "monthly";

  if (rollup.aggregationType === "sum") {
    // Find actual contributing child period_starts
    const childStarts: string[] = [];
    for (const m of sourceMetrics) {
      if (m.metric_name !== rollup.metric_name) continue;
      if (m.period_type !== sourceType) continue;
      const targetStart =
        rollup.period_type === "quarterly"
          ? monthToQuarterStart(m.period_start)
          : toAnnualStart(m.period_start);
      if (targetStart === rollup.period_start) {
        childStarts.push(m.period_start);
      }
    }
    childStarts.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    const labels = childStarts.map((s) => formatChildPeriod(s, sourceType));
    return `Sum of ${labels.join(", ")}`;
  }

  // latest
  const lastStart = lastChildPeriodStart(rollup.period_start, sourceType, rollup.period_type as "quarterly" | "annual");
  return `Latest: ${formatChildPeriod(lastStart, sourceType)}`;
}

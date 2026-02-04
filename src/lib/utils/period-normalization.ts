/**
 * Period Normalization Utility
 *
 * Normalizes extracted period dates to canonical start/end dates.
 * This ensures consistent period alignment regardless of AI extraction quirks.
 *
 * Rules:
 * - Quarterly: period_start = first day of quarter (Jan 1, Apr 1, Jul 1, Oct 1)
 * - Monthly: period_start = first day of month
 * - Annual: period_start = Jan 1 of the year
 * - period_end = last day of the period
 */

export type PeriodType = "monthly" | "quarterly" | "annual" | "yearly";

export type NormalizedPeriod = {
  period_start: string; // YYYY-MM-DD
  period_end: string; // YYYY-MM-DD
  period_type: PeriodType;
  /** If normalization changed the dates */
  was_adjusted: boolean;
  /** Human-readable label (e.g., "Q4 2024", "Dec 2024", "2024") */
  label: string;
};

/**
 * Get the quarter number (1-4) from a month (0-11)
 */
function getQuarter(month: number): number {
  return Math.floor(month / 3) + 1;
}

/**
 * Get the first month (0-indexed) of a quarter (1-4)
 */
function getQuarterStartMonth(quarter: number): number {
  return (quarter - 1) * 3;
}

/**
 * Get the last day of a month
 */
function getLastDayOfMonth(year: number, month: number): number {
  // month is 0-indexed, so month+1 gives next month, day 0 gives last day of current
  return new Date(year, month + 1, 0).getDate();
}

/**
 * Format a date as YYYY-MM-DD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date string safely, handling timezone issues
 */
function parseDate(dateStr: string): Date | null {
  if (!dateStr) return null;

  // Handle YYYY-MM-DD format explicitly to avoid timezone issues
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  }

  // Fallback to Date parsing
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date;
}

/**
 * Generate a human-readable period label
 */
function generateLabel(
  year: number,
  month: number,
  periodType: PeriodType,
): string {
  if (periodType === "quarterly") {
    const quarter = getQuarter(month);
    return `Q${quarter} ${year}`;
  }

  if (periodType === "monthly") {
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[month]} ${year}`;
  }

  // Annual/yearly
  return String(year);
}

/**
 * Normalize a period to canonical start/end dates
 *
 * @param periodStart - The extracted period_start (may be any date within the period)
 * @param periodEnd - The extracted period_end (optional, will be calculated if missing)
 * @param periodType - The period type (monthly, quarterly, annual, yearly)
 * @returns Normalized period with canonical dates
 */
export function normalizePeriod(
  periodStart: string,
  periodEnd: string | null | undefined,
  periodType: string,
): NormalizedPeriod | null {
  const date = parseDate(periodStart);
  if (!date) {
    console.warn(`[period-normalization] Invalid date: ${periodStart}`);
    return null;
  }

  const year = date.getFullYear();
  const month = date.getMonth(); // 0-indexed
  const day = date.getDate();

  // Normalize period type
  const normalizedType: PeriodType =
    periodType === "yearly" ? "annual" : (periodType as PeriodType);

  let normalizedStart: Date;
  let normalizedEnd: Date;
  let label: string;

  switch (normalizedType) {
    case "quarterly": {
      const quarter = getQuarter(month);
      const quarterStartMonth = getQuarterStartMonth(quarter);
      const quarterEndMonth = quarterStartMonth + 2;

      normalizedStart = new Date(year, quarterStartMonth, 1);
      normalizedEnd = new Date(
        year,
        quarterEndMonth,
        getLastDayOfMonth(year, quarterEndMonth),
      );
      label = generateLabel(year, quarterStartMonth, normalizedType);
      break;
    }

    case "monthly": {
      normalizedStart = new Date(year, month, 1);
      normalizedEnd = new Date(year, month, getLastDayOfMonth(year, month));
      label = generateLabel(year, month, normalizedType);
      break;
    }

    case "annual":
    default: {
      normalizedStart = new Date(year, 0, 1);
      normalizedEnd = new Date(year, 11, 31);
      label = generateLabel(year, 0, "annual");
      break;
    }
  }

  const normalizedStartStr = formatDate(normalizedStart);
  const normalizedEndStr = formatDate(normalizedEnd);

  // Check if dates were adjusted
  const originalStart = formatDate(date);
  const startWasAdjusted = originalStart !== normalizedStartStr;
  const endWasAdjusted = periodEnd != null && periodEnd !== normalizedEndStr;
  const wasAdjusted = startWasAdjusted || endWasAdjusted;

  return {
    period_start: normalizedStartStr,
    period_end: normalizedEndStr,
    period_type: normalizedType,
    was_adjusted: wasAdjusted,
    label,
  };
}

/**
 * Batch normalize multiple periods (for processing dozens of metrics efficiently)
 *
 * @param metrics - Array of metrics with period information
 * @returns Array of metrics with normalized periods
 */
export function normalizeMetricPeriods<
  T extends {
    period_start: string;
    period_end?: string | null;
    period_type: string;
  },
>(
  metrics: T[],
): (T & {
  original_period_start?: string;
  original_period_end?: string;
  period_was_adjusted?: boolean;
})[] {
  return metrics.map((metric) => {
    const normalized = normalizePeriod(
      metric.period_start,
      metric.period_end,
      metric.period_type,
    );

    if (!normalized) {
      // Return original if normalization fails
      return {
        ...metric,
        period_was_adjusted: false,
      };
    }

    return {
      ...metric,
      // Preserve originals for debugging/audit
      original_period_start:
        metric.period_start !== normalized.period_start
          ? metric.period_start
          : undefined,
      original_period_end:
        metric.period_end !== normalized.period_end
          ? metric.period_end ?? undefined
          : undefined,
      // Apply normalized values
      period_start: normalized.period_start,
      period_end: normalized.period_end,
      period_type: normalized.period_type,
      period_was_adjusted: normalized.was_adjusted,
    };
  });
}

/**
 * Validate that a period_start date aligns with the expected period boundaries
 *
 * @returns true if the date is already on the correct boundary
 */
export function isPeriodAligned(
  periodStart: string,
  periodType: string,
): boolean {
  const date = parseDate(periodStart);
  if (!date) return false;

  const day = date.getDate();
  const month = date.getMonth();

  switch (periodType) {
    case "quarterly":
      // Must be first day of Jan, Apr, Jul, or Oct
      return day === 1 && [0, 3, 6, 9].includes(month);

    case "monthly":
      // Must be first day of any month
      return day === 1;

    case "annual":
    case "yearly":
      // Must be Jan 1
      return day === 1 && month === 0;

    default:
      return true;
  }
}

/**
 * Get the canonical period key for deduplication
 * (useful for matching metrics across different extractions)
 */
export function getPeriodKey(
  periodStart: string,
  periodType: string,
): string | null {
  const normalized = normalizePeriod(periodStart, null, periodType);
  if (!normalized) return null;

  return `${normalized.period_type}:${normalized.period_start}`;
}

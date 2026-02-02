/**
 * Period calculation utilities for metric requests.
 *
 * Supports two period types:
 * - Quarterly: Q1-Q4 of a given year
 * - Annual: Full calendar year
 *
 * Dates are calculated as:
 * - Q1: Jan 1 - Mar 31
 * - Q2: Apr 1 - Jun 30
 * - Q3: Jul 1 - Sep 30
 * - Q4: Oct 1 - Dec 31
 * - Annual: Jan 1 - Dec 31
 */

export type PeriodType = "quarterly" | "annual";

export type PeriodInput =
  | { type: "quarterly"; year: number; quarter: 1 | 2 | 3 | 4 }
  | { type: "annual"; year: number };

export interface PeriodDates {
  periodStart: string; // ISO date (YYYY-MM-DD)
  periodEnd: string; // ISO date (YYYY-MM-DD)
}

const QUARTER_MONTHS: Record<1 | 2 | 3 | 4, { start: number; end: number }> = {
  1: { start: 0, end: 2 }, // Jan-Mar (0-indexed months)
  2: { start: 3, end: 5 }, // Apr-Jun
  3: { start: 6, end: 8 }, // Jul-Sep
  4: { start: 9, end: 11 }, // Oct-Dec
};

const QUARTER_END_DAYS: Record<1 | 2 | 3 | 4, number> = {
  1: 31, // Mar 31
  2: 30, // Jun 30
  3: 30, // Sep 30
  4: 31, // Dec 31
};

/**
 * Calculate period start and end dates from a period input.
 */
export function calculatePeriodDates(input: PeriodInput): PeriodDates {
  if (input.type === "quarterly") {
    const { year, quarter } = input;
    const startMonth = QUARTER_MONTHS[quarter].start;
    const endMonth = QUARTER_MONTHS[quarter].end;
    const endDay = QUARTER_END_DAYS[quarter];

    return {
      periodStart: formatDate(year, startMonth, 1),
      periodEnd: formatDate(year, endMonth, endDay),
    };
  }

  // Annual
  const { year } = input;
  return {
    periodStart: formatDate(year, 0, 1), // Jan 1
    periodEnd: formatDate(year, 11, 31), // Dec 31
  };
}

/**
 * Format a date as ISO string (YYYY-MM-DD).
 */
function formatDate(year: number, month: number, day: number): string {
  const y = year.toString().padStart(4, "0");
  const m = (month + 1).toString().padStart(2, "0"); // month is 0-indexed
  const d = day.toString().padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Get a human-readable label for a period.
 */
export function getPeriodLabel(input: PeriodInput): string {
  if (input.type === "quarterly") {
    return `Q${input.quarter} ${input.year}`;
  }
  return `${input.year}`;
}

/**
 * Generate available quarters for selection (current year + past 2 years).
 */
export function getAvailableQuarters(): Array<{
  year: number;
  quarter: 1 | 2 | 3 | 4;
  label: string;
}> {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentQuarter = Math.ceil((now.getMonth() + 1) / 3) as 1 | 2 | 3 | 4;

  const quarters: Array<{
    year: number;
    quarter: 1 | 2 | 3 | 4;
    label: string;
  }> = [];

  // Generate quarters for current year and past 2 years
  for (let year = currentYear; year >= currentYear - 2; year--) {
    const maxQuarter = year === currentYear ? currentQuarter : 4;
    for (let q = maxQuarter; q >= 1; q--) {
      const quarter = q as 1 | 2 | 3 | 4;
      quarters.push({
        year,
        quarter,
        label: `Q${quarter} ${year}`,
      });
    }
  }

  return quarters;
}

/**
 * Generate available years for selection (current year + past 5 years).
 */
export function getAvailableYears(): Array<{ year: number; label: string }> {
  const currentYear = new Date().getFullYear();
  const years: Array<{ year: number; label: string }> = [];

  // Only include completed years (not current year for annual requests)
  for (let year = currentYear - 1; year >= currentYear - 6; year--) {
    years.push({
      year,
      label: `${year}`,
    });
  }

  return years;
}

/**
 * Validate quarter input.
 */
export function isValidQuarter(quarter: number): quarter is 1 | 2 | 3 | 4 {
  return quarter >= 1 && quarter <= 4 && Number.isInteger(quarter);
}

/**
 * Validate year input (reasonable range).
 */
export function isValidYear(year: number): boolean {
  const currentYear = new Date().getFullYear();
  return year >= 2000 && year <= currentYear + 1 && Number.isInteger(year);
}

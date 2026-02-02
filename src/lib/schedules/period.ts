import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfQuarter,
  endOfQuarter,
  subQuarters,
  startOfYear,
  endOfYear,
  subYears,
  format,
} from "date-fns";

export type ScheduleCadence = "monthly" | "quarterly" | "annual";

export interface ReportingPeriod {
  periodStart: Date;
  periodEnd: Date;
}

/**
 * Calculate the reporting period for a given run date and cadence.
 * The period is always the PREVIOUS completed period.
 *
 * For monthly: previous calendar month
 * For quarterly: previous calendar quarter
 * For annual: previous calendar year
 */
export function calculateReportingPeriod(
  cadence: ScheduleCadence,
  runDate: Date = new Date()
): ReportingPeriod {
  switch (cadence) {
    case "monthly": {
      const previousMonth = subMonths(runDate, 1);
      return {
        periodStart: startOfMonth(previousMonth),
        periodEnd: endOfMonth(previousMonth),
      };
    }
    case "quarterly": {
      const previousQuarter = subQuarters(runDate, 1);
      return {
        periodStart: startOfQuarter(previousQuarter),
        periodEnd: endOfQuarter(previousQuarter),
      };
    }
    case "annual": {
      const previousYear = subYears(runDate, 1);
      return {
        periodStart: startOfYear(previousYear),
        periodEnd: endOfYear(previousYear),
      };
    }
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }
}

/**
 * Format a reporting period for display.
 * Monthly: "January 2025"
 * Quarterly: "Q1 2025"
 * Annual: "2024"
 */
export function formatReportingPeriod(
  cadence: ScheduleCadence,
  periodStart: Date
): string {
  switch (cadence) {
    case "monthly":
      return format(periodStart, "MMMM yyyy");
    case "quarterly": {
      const quarter = Math.floor(periodStart.getMonth() / 3) + 1;
      return `Q${quarter} ${format(periodStart, "yyyy")}`;
    }
    case "annual":
      return format(periodStart, "yyyy");
    default:
      return format(periodStart, "MMM d, yyyy");
  }
}

/**
 * Get a human-readable description of the cadence.
 */
export function getCadenceDescription(cadence: ScheduleCadence): string {
  switch (cadence) {
    case "monthly":
      return "Monthly";
    case "quarterly":
      return "Quarterly";
    case "annual":
      return "Annually";
    default:
      return cadence;
  }
}

/**
 * Get the period type that corresponds to a cadence.
 * Used when creating metric requests.
 */
export function cadenceToPeriodType(
  cadence: ScheduleCadence
): "monthly" | "quarterly" | "annual" {
  return cadence;
}

import {
  setDate,
  addMonths,
  addQuarters,
  addYears,
  startOfMonth,
  startOfQuarter,
  startOfYear,
  setHours,
  setMinutes,
  setSeconds,
  setMilliseconds,
  isBefore,
  getDate,
  getDaysInMonth,
} from "date-fns";

import type { ScheduleCadence } from "./period";

/**
 * Calculate the next run date for a schedule based on its cadence and day of month.
 *
 * Rules:
 * - Monthly: Next occurrence of the specified day
 * - Quarterly: First month of next quarter (Jan, Apr, Jul, Oct) on the specified day
 * - Annual: January of next year on the specified day
 *
 * @param cadence - The schedule cadence
 * @param dayOfMonth - Day of month to run (1-28)
 * @param fromDate - Calculate next run after this date (defaults to now)
 * @returns Next run date at 6 AM UTC
 */
export function calculateNextRunDate(
  cadence: ScheduleCadence,
  dayOfMonth: number,
  fromDate: Date = new Date()
): Date {
  // Clamp day to valid range
  const day = Math.max(1, Math.min(28, dayOfMonth));

  let targetDate: Date;

  switch (cadence) {
    case "monthly": {
      // Start with the current month
      let target = setDate(startOfMonth(fromDate), day);

      // If the day has already passed this month, go to next month
      if (isBefore(target, fromDate) || getDate(target) !== day) {
        const nextMonth = addMonths(startOfMonth(fromDate), 1);
        const maxDay = getDaysInMonth(nextMonth);
        target = setDate(nextMonth, Math.min(day, maxDay));
      }

      targetDate = target;
      break;
    }

    case "quarterly": {
      // Quarterly runs on first month of quarter (Jan, Apr, Jul, Oct)
      const quarterStart = startOfQuarter(fromDate);
      let target = setDate(quarterStart, Math.min(day, getDaysInMonth(quarterStart)));

      // If we've passed the run day in the current quarter, go to next quarter
      if (isBefore(target, fromDate)) {
        const nextQuarter = addQuarters(quarterStart, 1);
        const maxDay = getDaysInMonth(nextQuarter);
        target = setDate(nextQuarter, Math.min(day, maxDay));
      }

      targetDate = target;
      break;
    }

    case "annual": {
      // Annual runs in January
      const yearStart = startOfYear(fromDate);
      let target = setDate(yearStart, Math.min(day, 31)); // January has 31 days

      // If we've passed January's run day, go to next year
      if (isBefore(target, fromDate)) {
        const nextYear = addYears(yearStart, 1);
        target = setDate(nextYear, Math.min(day, 31));
      }

      targetDate = target;
      break;
    }

    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  // Set time to 6 AM UTC
  return setMilliseconds(setSeconds(setMinutes(setHours(targetDate, 6), 0), 0), 0);
}

/**
 * Calculate the next run date after completing a run.
 * This advances to the next period after the current run.
 */
export function calculateNextRunAfterCompletion(
  cadence: ScheduleCadence,
  dayOfMonth: number,
  lastRunDate: Date
): Date {
  const day = Math.max(1, Math.min(28, dayOfMonth));

  let nextPeriodStart: Date;

  switch (cadence) {
    case "monthly":
      nextPeriodStart = addMonths(startOfMonth(lastRunDate), 1);
      break;
    case "quarterly":
      nextPeriodStart = addQuarters(startOfQuarter(lastRunDate), 1);
      break;
    case "annual":
      nextPeriodStart = addYears(startOfYear(lastRunDate), 1);
      break;
    default:
      throw new Error(`Invalid cadence: ${cadence}`);
  }

  const maxDay = getDaysInMonth(nextPeriodStart);
  const targetDate = setDate(nextPeriodStart, Math.min(day, maxDay));

  // Set time to 6 AM UTC
  return setMilliseconds(setSeconds(setMinutes(setHours(targetDate, 6), 0), 0), 0);
}

/**
 * Check if a schedule is due to run.
 */
export function isScheduleDue(nextRunAt: Date, now: Date = new Date()): boolean {
  return isBefore(nextRunAt, now) || nextRunAt.getTime() === now.getTime();
}

/**
 * Calculate reminder dates based on due date and reminder configuration.
 */
export function calculateReminderDates(
  dueDate: Date,
  reminderDaysBeforeDue: number[]
): Date[] {
  return reminderDaysBeforeDue
    .filter((days) => days > 0)
    .sort((a, b) => b - a) // Sort descending (earliest reminder first)
    .map((days) => {
      const reminderDate = new Date(dueDate);
      reminderDate.setDate(reminderDate.getDate() - days);
      // Set to 9 AM UTC for reminders
      return setMilliseconds(setSeconds(setMinutes(setHours(reminderDate, 9), 0), 0), 0);
    })
    .filter((date) => date > new Date()); // Only future reminders
}

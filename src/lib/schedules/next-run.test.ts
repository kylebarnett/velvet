import { describe, it, expect, vi } from "vitest";
import {
  calculateNextRunDate,
  calculateNextRunAfterCompletion,
  isScheduleDue,
  calculateReminderDates,
} from "./next-run";

describe("calculateNextRunDate", () => {
  it("returns future date for monthly cadence", () => {
    const from = new Date(2025, 0, 10); // Jan 10
    const result = calculateNextRunDate("monthly", 15, from);
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(0); // Still January (day 15 hasn't passed)
    expect(result.getHours()).toBe(6); // 6 AM UTC
  });

  it("advances to next month when day has passed", () => {
    const from = new Date(2025, 0, 20); // Jan 20
    const result = calculateNextRunDate("monthly", 5, from);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(1); // February
  });

  it("clamps day to 28 max", () => {
    const result = calculateNextRunDate("monthly", 31, new Date(2025, 0, 1));
    expect(result.getDate()).toBeLessThanOrEqual(28);
  });

  it("handles quarterly cadence", () => {
    const from = new Date(2025, 0, 1); // Jan 1 (Q1 start)
    const result = calculateNextRunDate("quarterly", 5, from);
    expect(result.getDate()).toBe(5);
    expect(result.getMonth()).toBe(0); // January (Q1 first month)
  });

  it("advances to next quarter when day passed", () => {
    const from = new Date(2025, 0, 10); // Jan 10
    const result = calculateNextRunDate("quarterly", 5, from);
    expect(result.getMonth()).toBe(3); // April (Q2 first month)
  });

  it("handles annual cadence", () => {
    const from = new Date(2025, 0, 1); // Jan 1
    const result = calculateNextRunDate("annual", 10, from);
    expect(result.getDate()).toBe(10);
    expect(result.getMonth()).toBe(0); // January
    expect(result.getFullYear()).toBe(2025);
  });

  it("advances to next year when January day passed", () => {
    const from = new Date(2025, 1, 1); // Feb 1
    const result = calculateNextRunDate("annual", 5, from);
    expect(result.getFullYear()).toBe(2026);
    expect(result.getMonth()).toBe(0); // January
  });

  it("throws for invalid cadence", () => {
    // @ts-expect-error testing invalid input
    expect(() => calculateNextRunDate("weekly", 5)).toThrow("Invalid cadence");
  });
});

describe("calculateNextRunAfterCompletion", () => {
  it("advances to next month for monthly", () => {
    const lastRun = new Date(2025, 0, 5); // Jan 5
    const result = calculateNextRunAfterCompletion("monthly", 5, lastRun);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(5);
  });

  it("advances to next quarter for quarterly", () => {
    const lastRun = new Date(2025, 0, 5); // Q1
    const result = calculateNextRunAfterCompletion("quarterly", 5, lastRun);
    expect(result.getMonth()).toBe(3); // April (Q2)
  });

  it("advances to next year for annual", () => {
    const lastRun = new Date(2025, 0, 5);
    const result = calculateNextRunAfterCompletion("annual", 5, lastRun);
    expect(result.getFullYear()).toBe(2026);
  });
});

describe("isScheduleDue", () => {
  it("returns true when next run is in the past", () => {
    const pastDate = new Date(2024, 0, 1);
    const now = new Date(2025, 0, 1);
    expect(isScheduleDue(pastDate, now)).toBe(true);
  });

  it("returns true when next run is exactly now", () => {
    const now = new Date(2025, 0, 1);
    expect(isScheduleDue(now, now)).toBe(true);
  });

  it("returns false when next run is in the future", () => {
    const futureDate = new Date(2026, 0, 1);
    const now = new Date(2025, 0, 1);
    expect(isScheduleDue(futureDate, now)).toBe(false);
  });
});

describe("calculateReminderDates", () => {
  it("calculates reminder dates before due date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));

    const dueDate = new Date(2025, 0, 15);
    const result = calculateReminderDates(dueDate, [7, 3, 1]);

    // Should return dates 7, 3, and 1 days before due
    expect(result.length).toBe(3);
    expect(result[0].getDate()).toBe(8); // 7 days before
    expect(result[1].getDate()).toBe(12); // 3 days before
    expect(result[2].getDate()).toBe(14); // 1 day before

    vi.useRealTimers();
  });

  it("filters out zero and negative days", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));

    const dueDate = new Date(2025, 0, 15);
    const result = calculateReminderDates(dueDate, [3, 0, -1]);

    expect(result.length).toBe(1);

    vi.useRealTimers();
  });

  it("filters out past reminder dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 13)); // Only 2 days before due

    const dueDate = new Date(2025, 0, 15);
    const result = calculateReminderDates(dueDate, [7, 3, 1]);

    // Only 1-day-before should remain (Jan 14 > Jan 13)
    expect(result.length).toBe(1);

    vi.useRealTimers();
  });

  it("sets reminder time to 9 AM", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2025, 0, 1));

    const dueDate = new Date(2025, 0, 15);
    const result = calculateReminderDates(dueDate, [3]);

    expect(result[0].getHours()).toBe(9);
    expect(result[0].getMinutes()).toBe(0);

    vi.useRealTimers();
  });
});

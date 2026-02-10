import { describe, it, expect } from "vitest";
import { formatPeriodRange, formatDate } from "./format-date";

describe("formatPeriodRange", () => {
  it("formats quarterly period", () => {
    expect(formatPeriodRange("2025-01-01", "2025-03-31", "quarterly")).toBe("Q1 2025");
    expect(formatPeriodRange("2025-04-01", "2025-06-30", "quarterly")).toBe("Q2 2025");
    expect(formatPeriodRange("2025-07-01", "2025-09-30", "quarterly")).toBe("Q3 2025");
    expect(formatPeriodRange("2025-10-01", "2025-12-31", "quarterly")).toBe("Q4 2025");
  });

  it("formats monthly period", () => {
    expect(formatPeriodRange("2025-01-01", "2025-01-31", "monthly")).toBe("Jan 2025");
    expect(formatPeriodRange("2025-06-01", "2025-06-30", "monthly")).toBe("Jun 2025");
  });

  it("formats annual period", () => {
    expect(formatPeriodRange("2024-01-01", "2024-12-31", "annual")).toBe("2024");
  });

  it("formats yearly period (alias)", () => {
    expect(formatPeriodRange("2024-01-01", "2024-12-31", "yearly")).toBe("2024");
  });

  it("falls back to range format for unknown period type", () => {
    const result = formatPeriodRange("2024-01-01", "2024-06-30");
    expect(result).toBe("Jan 1 – Jun 30, 2024");
  });

  it("includes both years when range spans years", () => {
    const result = formatPeriodRange("2024-11-01", "2025-01-31");
    expect(result).toBe("Nov 1, 2024 – Jan 31, 2025");
  });
});

describe("formatDate", () => {
  it("formats ISO date string", () => {
    expect(formatDate("2025-01-15")).toBe("Jan 15, 2025");
    expect(formatDate("2024-12-25")).toBe("Dec 25, 2024");
  });

  it("handles ISO datetime strings", () => {
    expect(formatDate("2025-03-01T12:00:00Z")).toBe("Mar 1, 2025");
  });
});

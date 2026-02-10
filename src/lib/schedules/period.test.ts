import { describe, it, expect } from "vitest";
import {
  calculateReportingPeriod,
  formatReportingPeriod,
  getCadenceDescription,
  cadenceToPeriodType,
} from "./period";

describe("calculateReportingPeriod", () => {
  it("returns previous month for monthly cadence", () => {
    const runDate = new Date(2025, 2, 15); // March 15, 2025
    const result = calculateReportingPeriod("monthly", runDate);
    expect(result.periodStart.getMonth()).toBe(1); // February
    expect(result.periodStart.getFullYear()).toBe(2025);
  });

  it("returns previous quarter for quarterly cadence", () => {
    const runDate = new Date(2025, 3, 5); // April 5, 2025 (Q2)
    const result = calculateReportingPeriod("quarterly", runDate);
    expect(result.periodStart.getMonth()).toBe(0); // January (Q1 start)
    expect(result.periodEnd.getMonth()).toBe(2); // March (Q1 end)
  });

  it("returns previous year for annual cadence", () => {
    const runDate = new Date(2025, 0, 15); // Jan 15, 2025
    const result = calculateReportingPeriod("annual", runDate);
    expect(result.periodStart.getFullYear()).toBe(2024);
    expect(result.periodEnd.getFullYear()).toBe(2024);
  });

  it("throws for invalid cadence", () => {
    // @ts-expect-error testing invalid input
    expect(() => calculateReportingPeriod("weekly")).toThrow("Invalid cadence");
  });
});

describe("formatReportingPeriod", () => {
  it("formats monthly period", () => {
    const result = formatReportingPeriod("monthly", new Date(2025, 0, 1));
    expect(result).toBe("January 2025");
  });

  it("formats quarterly period", () => {
    const result = formatReportingPeriod("quarterly", new Date(2025, 3, 1));
    expect(result).toBe("Q2 2025");
  });

  it("formats annual period", () => {
    const result = formatReportingPeriod("annual", new Date(2024, 0, 1));
    expect(result).toBe("2024");
  });
});

describe("getCadenceDescription", () => {
  it("returns human-readable descriptions", () => {
    expect(getCadenceDescription("monthly")).toBe("Monthly");
    expect(getCadenceDescription("quarterly")).toBe("Quarterly");
    expect(getCadenceDescription("annual")).toBe("Annually");
  });
});

describe("cadenceToPeriodType", () => {
  it("returns same value (identity mapping)", () => {
    expect(cadenceToPeriodType("monthly")).toBe("monthly");
    expect(cadenceToPeriodType("quarterly")).toBe("quarterly");
    expect(cadenceToPeriodType("annual")).toBe("annual");
  });
});

import { describe, it, expect } from "vitest";
import {
  calculatePeriodDates,
  getPeriodLabel,
  isValidQuarter,
  isValidYear,
} from "./period";

describe("calculatePeriodDates", () => {
  it("calculates Q1 dates correctly", () => {
    const result = calculatePeriodDates({ type: "quarterly", year: 2025, quarter: 1 });
    expect(result.periodStart).toBe("2025-01-01");
    expect(result.periodEnd).toBe("2025-03-31");
  });

  it("calculates Q2 dates correctly", () => {
    const result = calculatePeriodDates({ type: "quarterly", year: 2025, quarter: 2 });
    expect(result.periodStart).toBe("2025-04-01");
    expect(result.periodEnd).toBe("2025-06-30");
  });

  it("calculates Q3 dates correctly", () => {
    const result = calculatePeriodDates({ type: "quarterly", year: 2025, quarter: 3 });
    expect(result.periodStart).toBe("2025-07-01");
    expect(result.periodEnd).toBe("2025-09-30");
  });

  it("calculates Q4 dates correctly", () => {
    const result = calculatePeriodDates({ type: "quarterly", year: 2025, quarter: 4 });
    expect(result.periodStart).toBe("2025-10-01");
    expect(result.periodEnd).toBe("2025-12-31");
  });

  it("calculates annual dates correctly", () => {
    const result = calculatePeriodDates({ type: "annual", year: 2024 });
    expect(result.periodStart).toBe("2024-01-01");
    expect(result.periodEnd).toBe("2024-12-31");
  });
});

describe("getPeriodLabel", () => {
  it("formats quarterly label", () => {
    expect(getPeriodLabel({ type: "quarterly", year: 2025, quarter: 3 })).toBe("Q3 2025");
  });

  it("formats annual label", () => {
    expect(getPeriodLabel({ type: "annual", year: 2024 })).toBe("2024");
  });
});

describe("isValidQuarter", () => {
  it("accepts valid quarters", () => {
    expect(isValidQuarter(1)).toBe(true);
    expect(isValidQuarter(2)).toBe(true);
    expect(isValidQuarter(3)).toBe(true);
    expect(isValidQuarter(4)).toBe(true);
  });

  it("rejects invalid quarters", () => {
    expect(isValidQuarter(0)).toBe(false);
    expect(isValidQuarter(5)).toBe(false);
    expect(isValidQuarter(-1)).toBe(false);
    expect(isValidQuarter(1.5)).toBe(false);
  });
});

describe("isValidYear", () => {
  it("accepts valid years", () => {
    expect(isValidYear(2024)).toBe(true);
    expect(isValidYear(2000)).toBe(true);
  });

  it("rejects years before 2000", () => {
    expect(isValidYear(1999)).toBe(false);
  });

  it("rejects years far in the future", () => {
    const farFuture = new Date().getFullYear() + 5;
    expect(isValidYear(farFuture)).toBe(false);
  });

  it("rejects non-integer years", () => {
    expect(isValidYear(2024.5)).toBe(false);
  });
});

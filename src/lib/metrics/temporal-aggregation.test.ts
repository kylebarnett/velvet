import { describe, it, expect } from "vitest";
import {
  getDefaultAggregationType,
  recommendAggregationType,
  calculateRollingTotal,
  getTotalColumnLabel,
  getAggregationIndicator,
} from "./temporal-aggregation";

// ---------------------------------------------------------------------------
// getDefaultAggregationType
// ---------------------------------------------------------------------------

describe("getDefaultAggregationType", () => {
  it("returns 'sum' for known flow metrics", () => {
    expect(getDefaultAggregationType("revenue")).toBe("sum");
    expect(getDefaultAggregationType("Revenue")).toBe("sum");
    expect(getDefaultAggregationType("operating expenses")).toBe("sum");
    expect(getDefaultAggregationType("gmv")).toBe("sum");
    expect(getDefaultAggregationType("api calls")).toBe("sum");
  });

  it("returns 'latest' for known point-in-time metrics", () => {
    expect(getDefaultAggregationType("arr")).toBe("latest");
    expect(getDefaultAggregationType("mrr")).toBe("latest");
    expect(getDefaultAggregationType("headcount")).toBe("latest");
    expect(getDefaultAggregationType("burn rate")).toBe("latest");
    expect(getDefaultAggregationType("gross margin")).toBe("latest");
  });

  it("returns 'latest' for unknown metrics (safe default)", () => {
    expect(getDefaultAggregationType("some custom metric")).toBe("latest");
    expect(getDefaultAggregationType("foobar")).toBe("latest");
  });
});

// ---------------------------------------------------------------------------
// recommendAggregationType
// ---------------------------------------------------------------------------

describe("recommendAggregationType", () => {
  it("returns high confidence 'sum' for known flow metrics", () => {
    const result = recommendAggregationType("revenue");
    expect(result.recommended).toBe("sum");
    expect(result.confidence).toBe("high");
  });

  it("returns high confidence 'latest' for known point-in-time metrics", () => {
    const result = recommendAggregationType("arr");
    expect(result.recommended).toBe("latest");
    expect(result.confidence).toBe("high");
  });

  it("returns medium confidence 'sum' for revenue-pattern match", () => {
    const result = recommendAggregationType("Custom Revenue Metric");
    expect(result.recommended).toBe("sum");
    expect(result.confidence).toBe("medium");
  });

  it("returns medium confidence 'sum' for expense-pattern match", () => {
    // The regex uses \b(spend|expense|cost|cogs)\b — "Total Spend" matches
    const result = recommendAggregationType("Total Spend");
    expect(result.recommended).toBe("sum");
    expect(result.confidence).toBe("medium");
  });

  it("returns medium confidence 'sum' for volume-pattern match", () => {
    const result = recommendAggregationType("Monthly API Volume");
    expect(result.recommended).toBe("sum");
    expect(result.confidence).toBe("medium");
  });

  it("returns medium confidence 'latest' for rate-pattern match", () => {
    const result = recommendAggregationType("Custom Rate");
    expect(result.recommended).toBe("latest");
    expect(result.confidence).toBe("medium");
  });

  it("returns medium confidence 'latest' for count-pattern match", () => {
    const result = recommendAggregationType("Premium Users");
    expect(result.recommended).toBe("latest");
    expect(result.confidence).toBe("medium");
  });

  it("returns medium confidence 'latest' for burn-pattern match", () => {
    const result = recommendAggregationType("Custom Burn");
    expect(result.recommended).toBe("latest");
    expect(result.confidence).toBe("medium");
  });

  it("returns low confidence 'latest' for completely unknown metrics", () => {
    const result = recommendAggregationType("xyzzy");
    expect(result.recommended).toBe("latest");
    expect(result.confidence).toBe("low");
  });

  it("always includes a reason string", () => {
    const knownFlow = recommendAggregationType("revenue");
    const knownPIT = recommendAggregationType("arr");
    const unknown = recommendAggregationType("unknown stuff");
    expect(knownFlow.reason.length).toBeGreaterThan(0);
    expect(knownPIT.reason.length).toBeGreaterThan(0);
    expect(unknown.reason.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// calculateRollingTotal
// ---------------------------------------------------------------------------

describe("calculateRollingTotal", () => {
  it("returns null for an empty array", () => {
    expect(calculateRollingTotal([], "sum")).toBeNull();
    expect(calculateRollingTotal([], "latest")).toBeNull();
  });

  it("returns null when all values are null", () => {
    expect(calculateRollingTotal([null, null, null], "sum")).toBeNull();
    expect(calculateRollingTotal([null, null, null], "latest")).toBeNull();
  });

  it("sums valid values for 'sum' aggregation type", () => {
    expect(calculateRollingTotal([10, 20, 30], "sum")).toBe(60);
  });

  it("skips nulls when summing", () => {
    expect(calculateRollingTotal([10, null, 30], "sum")).toBe(40);
  });

  it("returns the last non-null value for 'latest' aggregation type", () => {
    expect(calculateRollingTotal([10, 20, 30], "latest")).toBe(30);
  });

  it("skips trailing nulls for 'latest' (returns last non-null)", () => {
    expect(calculateRollingTotal([10, 20, null], "latest")).toBe(20);
  });

  it("handles a single non-null value", () => {
    expect(calculateRollingTotal([42], "sum")).toBe(42);
    expect(calculateRollingTotal([42], "latest")).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// getTotalColumnLabel
// ---------------------------------------------------------------------------

describe("getTotalColumnLabel", () => {
  it("returns 'Total' regardless of inputs", () => {
    expect(getTotalColumnLabel("monthly", 12)).toBe("Total");
    expect(getTotalColumnLabel("quarterly", 4)).toBe("Total");
    expect(getTotalColumnLabel("yearly", 3)).toBe("Total");
  });
});

// ---------------------------------------------------------------------------
// getAggregationIndicator
// ---------------------------------------------------------------------------

describe("getAggregationIndicator", () => {
  it("returns sigma symbol for sum aggregation", () => {
    const result = getAggregationIndicator("sum");
    expect(result.symbol).toBe("\u03A3"); // Σ
    expect(result.label).toContain("Sum");
  });

  it("returns bullet symbol for latest aggregation", () => {
    const result = getAggregationIndicator("latest");
    expect(result.symbol).toBe("\u25CF"); // ●
    expect(result.label).toContain("recent");
  });
});

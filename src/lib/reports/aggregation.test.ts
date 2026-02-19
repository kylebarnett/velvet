import { describe, it, expect } from "vitest";
import {
  canSumMetric,
  prefersMedian,
  calculateMedian,
  aggregateMetricValues,
  extractNumericValue,
  calculateGrowthRate,
  normalizeToIndex,
  calculateWeightedAverage,
  formatPeriodKey,
  formatPeriodLabel,
  identifyRevenueMetric,
  calculateCoverage,
} from "./aggregation";

// ---------------------------------------------------------------------------
// canSumMetric
// ---------------------------------------------------------------------------

describe("canSumMetric", () => {
  it("returns true for summable metrics", () => {
    expect(canSumMetric("revenue")).toBe(true);
    expect(canSumMetric("Revenue")).toBe(true);
    expect(canSumMetric("headcount")).toBe(true);
    expect(canSumMetric("burn rate")).toBe(true);
  });

  it("returns false for non-summable metrics", () => {
    expect(canSumMetric("gross margin")).toBe(false);
    expect(canSumMetric("churn rate")).toBe(false);
    expect(canSumMetric("some random metric")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// prefersMedian
// ---------------------------------------------------------------------------

describe("prefersMedian", () => {
  it("returns true for median-preferred metrics", () => {
    expect(prefersMedian("runway")).toBe(true);
    expect(prefersMedian("CAC")).toBe(true);
    expect(prefersMedian("ltv")).toBe(true);
  });

  it("returns false for non-median-preferred metrics", () => {
    expect(prefersMedian("revenue")).toBe(false);
    expect(prefersMedian("headcount")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// calculateMedian
// ---------------------------------------------------------------------------

describe("calculateMedian", () => {
  it("returns 0 for an empty array", () => {
    expect(calculateMedian([])).toBe(0);
  });

  it("returns the middle value for odd count", () => {
    expect(calculateMedian([3, 1, 2])).toBe(2);
    expect(calculateMedian([10, 20, 30, 40, 50])).toBe(30);
  });

  it("returns the average of two middle values for even count", () => {
    expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
    expect(calculateMedian([10, 20])).toBe(15);
  });

  it("handles a single value", () => {
    expect(calculateMedian([42])).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// aggregateMetricValues
// ---------------------------------------------------------------------------

describe("aggregateMetricValues", () => {
  it("returns defaults for an empty array", () => {
    const result = aggregateMetricValues([]);
    expect(result.sum).toBeNull();
    expect(result.average).toBe(0);
    expect(result.median).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
    expect(result.count).toBe(0);
    expect(result.values).toEqual([]);
  });

  it("calculates correctly for a single value", () => {
    const result = aggregateMetricValues([100]);
    expect(result.sum).toBe(100);
    expect(result.average).toBe(100);
    expect(result.median).toBe(100);
    expect(result.min).toBe(100);
    expect(result.max).toBe(100);
    expect(result.count).toBe(1);
  });

  it("calculates correctly for multiple values", () => {
    const result = aggregateMetricValues([10, 20, 30, 40, 50]);
    expect(result.sum).toBe(150);
    expect(result.average).toBe(30);
    expect(result.median).toBe(30);
    expect(result.min).toBe(10);
    expect(result.max).toBe(50);
    expect(result.count).toBe(5);
    expect(result.values).toEqual([10, 20, 30, 40, 50]);
  });
});

// ---------------------------------------------------------------------------
// extractNumericValue
// ---------------------------------------------------------------------------

describe("extractNumericValue", () => {
  it("returns null for null/undefined", () => {
    expect(extractNumericValue(null)).toBeNull();
    expect(extractNumericValue(undefined)).toBeNull();
  });

  it("returns the number for a direct number", () => {
    expect(extractNumericValue(42)).toBe(42);
    expect(extractNumericValue(0)).toBe(0);
    expect(extractNumericValue(-5.5)).toBe(-5.5);
  });

  it("parses a plain string", () => {
    expect(extractNumericValue("123")).toBe(123);
    expect(extractNumericValue("45.67")).toBe(45.67);
  });

  it("parses a string with currency formatting", () => {
    expect(extractNumericValue("$1,000")).toBe(1000);
    expect(extractNumericValue("$1,234,567.89")).toBe(1234567.89);
  });

  it("returns null for a non-numeric string", () => {
    expect(extractNumericValue("abc")).toBeNull();
    expect(extractNumericValue("")).toBeNull();
  });

  it("handles {raw: \"123\"} format (primary DB format)", () => {
    expect(extractNumericValue({ raw: "123" })).toBe(123);
    expect(extractNumericValue({ raw: "45.6" })).toBe(45.6);
  });

  it("handles {raw: number} format", () => {
    expect(extractNumericValue({ raw: 789 })).toBe(789);
  });

  it("handles {value: 456} format (legacy)", () => {
    expect(extractNumericValue({ value: 456 })).toBe(456);
  });

  it("handles {value: \"789\"} format (legacy string)", () => {
    expect(extractNumericValue({ value: "789" })).toBe(789);
  });

  it("returns null for an object without raw or value", () => {
    expect(extractNumericValue({ something: "else" })).toBeNull();
  });

  it("prefers raw over value", () => {
    expect(extractNumericValue({ raw: "100", value: "200" })).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// calculateGrowthRate
// ---------------------------------------------------------------------------

describe("calculateGrowthRate", () => {
  it("returns null when previous value is zero", () => {
    expect(calculateGrowthRate(100, 0)).toBeNull();
  });

  it("calculates positive growth", () => {
    // (200 - 100) / |100| * 100 = 100%
    expect(calculateGrowthRate(200, 100)).toBe(100);
  });

  it("calculates negative growth", () => {
    // (50 - 100) / |100| * 100 = -50%
    expect(calculateGrowthRate(50, 100)).toBe(-50);
  });

  it("handles negative previous value", () => {
    // (100 - (-50)) / |-50| * 100 = 150/50 * 100 = 300
    expect(calculateGrowthRate(100, -50)).toBe(300);
  });

  it("returns 0 when current equals previous", () => {
    expect(calculateGrowthRate(100, 100)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// normalizeToIndex
// ---------------------------------------------------------------------------

describe("normalizeToIndex", () => {
  it("returns 0 when base value is zero", () => {
    expect(normalizeToIndex(50, 0)).toBe(0);
  });

  it("returns 100 when current equals base", () => {
    expect(normalizeToIndex(200, 200)).toBe(100);
  });

  it("returns correct index for growth", () => {
    // (300 / 200) * 100 = 150
    expect(normalizeToIndex(300, 200)).toBe(150);
  });

  it("returns correct index for decline", () => {
    // (100 / 200) * 100 = 50
    expect(normalizeToIndex(100, 200)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// calculateWeightedAverage
// ---------------------------------------------------------------------------

describe("calculateWeightedAverage", () => {
  it("returns 0 when total weight is zero", () => {
    expect(
      calculateWeightedAverage([
        { value: 10, weight: 0 },
        { value: 20, weight: 0 },
      ]),
    ).toBe(0);
  });

  it("calculates weighted average correctly", () => {
    const result = calculateWeightedAverage([
      { value: 10, weight: 1 },
      { value: 20, weight: 3 },
    ]);
    // (10*1 + 20*3) / (1+3) = 70/4 = 17.5
    expect(result).toBe(17.5);
  });

  it("returns the value when there is a single entry", () => {
    expect(calculateWeightedAverage([{ value: 42, weight: 5 }])).toBe(42);
  });
});

// ---------------------------------------------------------------------------
// formatPeriodKey
// ---------------------------------------------------------------------------

describe("formatPeriodKey", () => {
  it("formats monthly period with UTC date", () => {
    // "2024-10-01" parses as midnight UTC — getUTCMonth() = 9 => month 10
    expect(formatPeriodKey("2024-10-01", "monthly")).toBe("2024-10");
  });

  it("formats quarterly period with UTC date", () => {
    // October = Q4
    expect(formatPeriodKey("2024-10-01", "quarterly")).toBe("2024-Q4");
  });

  it("formats quarterly period — Q1", () => {
    expect(formatPeriodKey("2024-01-15", "quarterly")).toBe("2024-Q1");
  });

  it("formats yearly period", () => {
    expect(formatPeriodKey("2024-10-01", "yearly")).toBe("2024");
  });

  it("returns the raw string for unknown period type", () => {
    expect(formatPeriodKey("2024-10-01", "weekly")).toBe("2024-10-01");
  });
});

// ---------------------------------------------------------------------------
// formatPeriodLabel
// ---------------------------------------------------------------------------

describe("formatPeriodLabel", () => {
  it("formats quarterly label", () => {
    expect(formatPeriodLabel("2024-Q4", "quarterly")).toBe("Q4 '24");
  });

  it("formats monthly label", () => {
    const label = formatPeriodLabel("2024-10", "monthly");
    // Should contain "Oct" and "'24"
    expect(label).toContain("Oct");
    expect(label).toContain("24");
  });

  it("returns the key as-is for unknown period type", () => {
    expect(formatPeriodLabel("2024", "yearly")).toBe("2024");
  });
});

// ---------------------------------------------------------------------------
// identifyRevenueMetric
// ---------------------------------------------------------------------------

describe("identifyRevenueMetric", () => {
  it("identifies MRR as the top priority revenue metric", () => {
    expect(identifyRevenueMetric(["Churn Rate", "MRR", "ARR"])).toBe("MRR");
  });

  it("identifies revenue when no MRR/ARR present", () => {
    expect(identifyRevenueMetric(["Headcount", "Revenue"])).toBe("Revenue");
  });

  it("returns null when no revenue-like metric is found", () => {
    expect(identifyRevenueMetric(["Headcount", "Churn Rate"])).toBeNull();
  });

  it("preserves original casing of the matched metric name", () => {
    expect(identifyRevenueMetric(["Net Revenue"])).toBe("Net Revenue");
  });

  it("returns null for an empty array", () => {
    expect(identifyRevenueMetric([])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// calculateCoverage
// ---------------------------------------------------------------------------

describe("calculateCoverage", () => {
  it("returns 0 percentage when total is 0", () => {
    const result = calculateCoverage(5, 0);
    expect(result.percentage).toBe(0);
    expect(result.count).toBe(5);
    expect(result.total).toBe(0);
  });

  it("calculates coverage correctly", () => {
    const result = calculateCoverage(3, 10);
    expect(result.count).toBe(3);
    expect(result.total).toBe(10);
    expect(result.percentage).toBe(30);
  });

  it("returns 100% for full coverage", () => {
    const result = calculateCoverage(10, 10);
    expect(result.percentage).toBe(100);
  });
});

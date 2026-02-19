import { describe, it, expect } from "vitest";
import {
  getSparklineValues,
  getPreviousValue,
  computeDelta,
  detectAnomaly,
  buildReportCard,
  formatReportValue,
} from "./batch-analytics";
import type { RawMetric } from "./batch-analytics";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeRaw(
  name: string,
  periodType: string,
  periodStart: string,
  value: number,
): RawMetric {
  return {
    metric_name: name,
    period_type: periodType,
    period_start: periodStart,
    value: { raw: String(value) },
  };
}

// ---------------------------------------------------------------------------
// getSparklineValues
// ---------------------------------------------------------------------------

describe("getSparklineValues", () => {
  it("returns last N numeric values sorted chronologically", () => {
    const metrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
      makeRaw("Revenue", "monthly", "2025-02-01", 200),
      makeRaw("Revenue", "monthly", "2025-03-01", 300),
      makeRaw("Revenue", "monthly", "2025-04-01", 400),
    ];
    const result = getSparklineValues(metrics, "Revenue", "monthly", 3);
    expect(result).toEqual([200, 300, 400]);
  });

  it("returns all values when fewer than count exist", () => {
    const metrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
      makeRaw("Revenue", "monthly", "2025-02-01", 200),
    ];
    const result = getSparklineValues(metrics, "Revenue", "monthly", 6);
    expect(result).toEqual([100, 200]);
  });

  it("matches metric name case-insensitively", () => {
    const metrics = [
      makeRaw("revenue", "monthly", "2025-01-01", 100),
      makeRaw("REVENUE", "monthly", "2025-02-01", 200),
    ];
    const result = getSparklineValues(metrics, "Revenue", "monthly");
    expect(result).toEqual([100, 200]);
  });

  it("only returns values matching the specified period type", () => {
    const metrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
      makeRaw("Revenue", "quarterly", "2025-01-01", 300),
      makeRaw("Revenue", "monthly", "2025-02-01", 200),
    ];
    const result = getSparklineValues(metrics, "Revenue", "monthly");
    expect(result).toEqual([100, 200]);
  });

  it("returns empty array when no matching metrics", () => {
    const metrics = [makeRaw("ARR", "monthly", "2025-01-01", 100)];
    const result = getSparklineValues(metrics, "Revenue", "monthly");
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getPreviousValue
// ---------------------------------------------------------------------------

describe("getPreviousValue", () => {
  it("returns the most recent value before the given date", () => {
    const metrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
      makeRaw("Revenue", "monthly", "2025-02-01", 200),
      makeRaw("Revenue", "monthly", "2025-03-01", 300),
    ];
    const result = getPreviousValue(metrics, "Revenue", "monthly", "2025-03-01");
    expect(result).toBe(200);
  });

  it("returns null when no prior values exist", () => {
    const metrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
    ];
    const result = getPreviousValue(metrics, "Revenue", "monthly", "2025-01-01");
    expect(result).toBeNull();
  });

  it("returns null when no metrics match the name", () => {
    const metrics = [
      makeRaw("ARR", "monthly", "2025-01-01", 100),
    ];
    const result = getPreviousValue(metrics, "Revenue", "monthly", "2025-02-01");
    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeDelta
// ---------------------------------------------------------------------------

describe("computeDelta", () => {
  it("computes positive delta (up)", () => {
    const result = computeDelta(150, 100);
    expect(result.absolute).toBe(50);
    expect(result.percent).toBe(50);
    expect(result.direction).toBe("up");
  });

  it("computes negative delta (down)", () => {
    const result = computeDelta(80, 100);
    expect(result.absolute).toBe(-20);
    expect(result.percent).toBe(-20);
    expect(result.direction).toBe("down");
  });

  it("computes flat delta when values are equal", () => {
    const result = computeDelta(100, 100);
    expect(result.absolute).toBe(0);
    expect(result.percent).toBe(0);
    expect(result.direction).toBe("flat");
  });

  it("returns null percent when previous value is zero", () => {
    const result = computeDelta(100, 0);
    expect(result.absolute).toBe(100);
    expect(result.percent).toBeNull();
    expect(result.direction).toBe("up");
  });

  it("handles negative previous value correctly", () => {
    // -100 to -50 is an increase of 50
    const result = computeDelta(-50, -100);
    expect(result.absolute).toBe(50);
    // (-50 - (-100)) / abs(-100) = 50/100 = 50%
    expect(result.percent).toBe(50);
    expect(result.direction).toBe("up");
  });
});

// ---------------------------------------------------------------------------
// detectAnomaly
// ---------------------------------------------------------------------------

describe("detectAnomaly", () => {
  it("returns not anomaly when fewer than 3 historical values", () => {
    const result = detectAnomaly(1000, [100, 200]);
    expect(result.isAnomaly).toBe(false);
    expect(result.message).toBeNull();
    expect(result.severity).toBeNull();
  });

  it("returns not anomaly when value is within 2 standard deviations", () => {
    // values: 100, 100, 100 → mean=100, stddev=0
    // But stddev < 0.01 and diff < 0.01, so treated as non-anomaly
    const result = detectAnomaly(100, [100, 100, 100]);
    expect(result.isAnomaly).toBe(false);
  });

  it("detects anomaly when value exceeds 2 standard deviations", () => {
    // values: 100, 102, 98, 101, 99 → mean~100, stddev~1.4
    // A value of 200 is way beyond 2 stddev
    const result = detectAnomaly(200, [100, 102, 98, 101, 99]);
    expect(result.isAnomaly).toBe(true);
    expect(result.message).toContain("higher");
    expect(result.severity).toBe("warning");
  });

  it("detects anomaly for significantly lower value", () => {
    const result = detectAnomaly(0, [100, 102, 98, 101, 99]);
    expect(result.isAnomaly).toBe(true);
    expect(result.message).toContain("lower");
    expect(result.severity).toBe("warning");
  });

  it("returns not anomaly for normal variation", () => {
    // Spread data with moderate stddev
    const historical = [100, 120, 80, 110, 90, 105, 95];
    // mean ~100, stddev ~12.5; 125 is ~2 stddev away, within range
    const result = detectAnomaly(115, historical);
    expect(result.isAnomaly).toBe(false);
  });

  it("detects anomaly when nearly constant values have a different entry", () => {
    // all the same → stddev ≈ 0 → special case: if diff >= 0.01, anomaly
    const result = detectAnomaly(200, [100, 100, 100]);
    expect(result.isAnomaly).toBe(true);
    expect(result.message).toContain("higher");
  });
});

// ---------------------------------------------------------------------------
// buildReportCard
// ---------------------------------------------------------------------------

describe("buildReportCard", () => {
  it("returns empty report card for no submissions", () => {
    const result = buildReportCard([], [], "monthly", "2025-03-01");
    expect(result.totalSubmitted).toBe(0);
    expect(result.items).toEqual([]);
    expect(result.biggestGain).toBeNull();
    expect(result.biggestDecline).toBeNull();
  });

  it("builds items with deltas when previous values exist", () => {
    const rawMetrics = [
      makeRaw("Revenue", "monthly", "2025-01-01", 100),
      makeRaw("Revenue", "monthly", "2025-02-01", 200),
    ];
    const submissions = [{ metricName: "Revenue", value: "250" }];
    const result = buildReportCard(submissions, rawMetrics, "monthly", "2025-03-01");

    expect(result.totalSubmitted).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0].newValue).toBe(250);
    expect(result.items[0].previousValue).toBe(200);
    expect(result.items[0].deltaPercent).toBe(25);
    expect(result.items[0].direction).toBe("up");
  });

  it("handles submission with no previous value", () => {
    const submissions = [{ metricName: "New Metric", value: "500" }];
    const result = buildReportCard(submissions, [], "monthly", "2025-03-01");

    expect(result.items).toHaveLength(1);
    expect(result.items[0].previousValue).toBeNull();
    expect(result.items[0].deltaPercent).toBeNull();
    expect(result.items[0].direction).toBe("flat");
  });

  it("identifies biggest gain and biggest decline", () => {
    const rawMetrics = [
      makeRaw("Revenue", "monthly", "2025-02-01", 100),
      makeRaw("Headcount", "monthly", "2025-02-01", 50),
      makeRaw("Burn Rate", "monthly", "2025-02-01", 200),
    ];
    const submissions = [
      { metricName: "Revenue", value: "200" },   // +100%
      { metricName: "Headcount", value: "55" },   // +10%
      { metricName: "Burn Rate", value: "100" },   // -50%
    ];
    const result = buildReportCard(submissions, rawMetrics, "monthly", "2025-03-01");

    expect(result.biggestGain?.metricName).toBe("Revenue");
    expect(result.biggestGain?.deltaPercent).toBe(100);
    expect(result.biggestDecline?.metricName).toBe("Burn Rate");
    expect(result.biggestDecline?.deltaPercent).toBe(-50);
  });

  it("skips non-numeric submission values", () => {
    const submissions = [{ metricName: "Revenue", value: "not-a-number" }];
    const result = buildReportCard(submissions, [], "monthly", "2025-03-01");
    expect(result.totalSubmitted).toBe(0);
    expect(result.items).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// formatReportValue
// ---------------------------------------------------------------------------

describe("formatReportValue", () => {
  it("formats currency metric with dollar sign", () => {
    const result = formatReportValue("Revenue", 1500000);
    expect(result).toBe("$1.5M");
  });

  it("formats smaller currency values with K suffix", () => {
    const result = formatReportValue("MRR", 50000);
    expect(result).toBe("$50K");
  });

  it("formats small currency values as plain dollars", () => {
    const result = formatReportValue("Revenue", 500);
    expect(result).toBe("$500");
  });

  it("formats percent metric with % symbol", () => {
    const result = formatReportValue("Churn Rate", 5.5);
    expect(result).toBe("5.5%");
  });

  it("formats Burn Rate as currency (not percentage)", () => {
    // Burn Rate contains "burn" (currency) and "rate" (percent)
    // Currency check must come first
    const result = formatReportValue("Burn Rate", 100000);
    expect(result).toBe("$100K");
  });

  it("formats plain number metric with locale string", () => {
    const result = formatReportValue("Headcount", 42);
    expect(result).toBe("42");
  });
});

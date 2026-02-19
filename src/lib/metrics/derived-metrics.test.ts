import { describe, it, expect } from "vitest";
import type { MetricValue } from "@/components/dashboard";
import { computeRunway, computePeriodDelta } from "./derived-metrics";
import type { RunwayResult, RunwayMissing, PeriodDelta } from "./derived-metrics";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function makeMetric(
  name: string,
  periodStart: string,
  value: unknown,
): MetricValue {
  return {
    id: `test-${name}-${periodStart}`,
    metric_name: name,
    period_type: "monthly",
    period_start: periodStart,
    period_end: periodStart, // not used by these functions
    value,
    notes: null,
    submitted_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// computeRunway
// ---------------------------------------------------------------------------

describe("computeRunway", () => {
  it("computes runway when both Cash Balance and Burn Rate are present", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "1200000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    expect(result.months).toBe(12);
    expect(result.cashBalance).toBe(1200000);
    expect(result.burnRate).toBe(100000);
  });

  it("returns critical urgency when runway < 6 months", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "400000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    expect(result.months).toBe(4);
    expect(result.urgency).toBe("critical");
  });

  it("returns warning urgency when runway >= 6 and < 12 months", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "800000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    expect(result.months).toBe(8);
    expect(result.urgency).toBe("warning");
  });

  it("returns healthy urgency when runway >= 12 months", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "2400000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    expect(result.months).toBe(24);
    expect(result.urgency).toBe("healthy");
  });

  it("returns missing Cash Balance when not provided", () => {
    const metrics = [
      makeMetric("Burn Rate", "2025-01-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayMissing;
    expect(result.missing).toContain("Cash Balance");
  });

  it("returns missing Burn Rate when not provided", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "1000000" }),
    ];
    const result = computeRunway(metrics) as RunwayMissing;
    expect(result.missing).toContain("Burn Rate");
  });

  it("returns missing both when neither is provided", () => {
    const result = computeRunway([]) as RunwayMissing;
    expect(result.missing).toContain("Cash Balance");
    expect(result.missing).toContain("Burn Rate");
    expect(result.missing).toHaveLength(2);
  });

  it("treats burn rate <= 0 as missing", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "1000000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "0" }),
    ];
    const result = computeRunway(metrics) as RunwayMissing;
    expect(result.missing).toContain("Burn Rate");
  });

  it("uses the latest period value when multiple periods exist", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", { raw: "2000000" }),
      makeMetric("Cash Balance", "2025-02-01", { raw: "1000000" }),
      makeMetric("Burn Rate", "2025-01-01", { raw: "200000" }),
      makeMetric("Burn Rate", "2025-02-01", { raw: "100000" }),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    // Should use Feb values (latest by period_start sort)
    expect(result.cashBalance).toBe(1000000);
    expect(result.burnRate).toBe(100000);
    expect(result.months).toBe(10);
  });

  it("handles plain numeric values", () => {
    const metrics = [
      makeMetric("Cash Balance", "2025-01-01", 500000),
      makeMetric("Burn Rate", "2025-01-01", 100000),
    ];
    const result = computeRunway(metrics) as RunwayResult;
    expect(result.months).toBe(5);
    expect(result.urgency).toBe("critical");
  });
});

// ---------------------------------------------------------------------------
// computePeriodDelta
// ---------------------------------------------------------------------------

describe("computePeriodDelta", () => {
  it("computes delta between two periods", () => {
    const metrics = [
      makeMetric("Revenue", "2025-01-01", { raw: "100000" }),
      makeMetric("Revenue", "2025-02-01", { raw: "120000" }),
    ];
    const result = computePeriodDelta(metrics, "Revenue") as PeriodDelta;
    expect(result.currentValue).toBe(120000);
    expect(result.previousValue).toBe(100000);
    expect(result.changeAbsolute).toBe(20000);
    expect(result.changePercent).toBe(20);
    expect(result.isPositive).toBe(true);
  });

  it("returns null when fewer than 2 periods exist", () => {
    const metrics = [
      makeMetric("Revenue", "2025-01-01", { raw: "100000" }),
    ];
    expect(computePeriodDelta(metrics, "Revenue")).toBeNull();
  });

  it("returns null when no metrics match the name", () => {
    const metrics = [
      makeMetric("Revenue", "2025-01-01", { raw: "100000" }),
      makeMetric("Revenue", "2025-02-01", { raw: "120000" }),
    ];
    expect(computePeriodDelta(metrics, "Headcount")).toBeNull();
  });

  it("returns null when previous value is zero", () => {
    const metrics = [
      makeMetric("Revenue", "2025-01-01", { raw: "0" }),
      makeMetric("Revenue", "2025-02-01", { raw: "50000" }),
    ];
    expect(computePeriodDelta(metrics, "Revenue")).toBeNull();
  });

  it("matches metric names case-insensitively", () => {
    const metrics = [
      makeMetric("revenue", "2025-01-01", { raw: "100000" }),
      makeMetric("REVENUE", "2025-02-01", { raw: "150000" }),
    ];
    const result = computePeriodDelta(metrics, "Revenue") as PeriodDelta;
    expect(result.changePercent).toBe(50);
  });

  it("marks negative change as positive for burn rate (negative-better metric)", () => {
    const metrics = [
      makeMetric("Burn Rate", "2025-01-01", { raw: "200000" }),
      makeMetric("Burn Rate", "2025-02-01", { raw: "150000" }),
    ];
    const result = computePeriodDelta(metrics, "Burn Rate") as PeriodDelta;
    expect(result.changeAbsolute).toBe(-50000);
    expect(result.changePercent).toBe(-25);
    // Decreasing burn rate is positive
    expect(result.isPositive).toBe(true);
  });

  it("marks positive change as negative for churn (negative-better metric)", () => {
    const metrics = [
      makeMetric("Churn Rate", "2025-01-01", { raw: "5" }),
      makeMetric("Churn Rate", "2025-02-01", { raw: "8" }),
    ];
    const result = computePeriodDelta(metrics, "Churn Rate") as PeriodDelta;
    expect(result.changePercent).toBe(60);
    // Increasing churn is negative
    expect(result.isPositive).toBe(false);
  });

  it("uses the two most recent periods when many exist", () => {
    const metrics = [
      makeMetric("MRR", "2025-01-01", { raw: "10000" }),
      makeMetric("MRR", "2025-02-01", { raw: "15000" }),
      makeMetric("MRR", "2025-03-01", { raw: "20000" }),
    ];
    const result = computePeriodDelta(metrics, "MRR") as PeriodDelta;
    // Most recent is March, previous is February
    expect(result.currentValue).toBe(20000);
    expect(result.previousValue).toBe(15000);
    expect(result.changeAbsolute).toBe(5000);
  });

  it("preserves the original metric name in the result", () => {
    const metrics = [
      makeMetric("revenue", "2025-01-01", { raw: "100" }),
      makeMetric("revenue", "2025-02-01", { raw: "200" }),
    ];
    const result = computePeriodDelta(metrics, "Revenue") as PeriodDelta;
    expect(result.metricName).toBe("Revenue");
  });
});

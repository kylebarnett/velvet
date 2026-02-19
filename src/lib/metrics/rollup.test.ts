import { describe, it, expect } from "vitest";
import {
  monthToQuarterStart,
  toAnnualStart,
  computeRollups,
  buildRollupDetail,
} from "./rollup";
import type { RolledUpValue } from "./rollup";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

type MetricInput = {
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
};

function makeMonthly(
  name: string,
  periodStart: string,
  value: number,
): MetricInput {
  return {
    metric_name: name,
    period_type: "monthly",
    period_start: periodStart,
    period_end: periodStart, // simplified, not used for grouping
    value: { raw: String(value) },
  };
}

function makeQuarterly(
  name: string,
  periodStart: string,
  value: number,
): MetricInput {
  return {
    metric_name: name,
    period_type: "quarterly",
    period_start: periodStart,
    period_end: periodStart,
    value: { raw: String(value) },
  };
}

function makeAnnual(
  name: string,
  periodStart: string,
  value: number,
): MetricInput {
  return {
    metric_name: name,
    period_type: "annual",
    period_start: periodStart,
    period_end: periodStart,
    value: { raw: String(value) },
  };
}

// ---------------------------------------------------------------------------
// monthToQuarterStart
// ---------------------------------------------------------------------------

describe("monthToQuarterStart", () => {
  it("maps January to Q1 start", () => {
    expect(monthToQuarterStart("2025-01-15")).toBe("2025-01-01");
  });

  it("maps February to Q1 start", () => {
    expect(monthToQuarterStart("2025-02-01")).toBe("2025-01-01");
  });

  it("maps March to Q1 start", () => {
    expect(monthToQuarterStart("2025-03-01")).toBe("2025-01-01");
  });

  it("maps April to Q2 start", () => {
    expect(monthToQuarterStart("2025-04-01")).toBe("2025-04-01");
  });

  it("maps July to Q3 start", () => {
    expect(monthToQuarterStart("2025-07-01")).toBe("2025-07-01");
  });

  it("maps October to Q4 start", () => {
    expect(monthToQuarterStart("2025-10-01")).toBe("2025-10-01");
  });

  it("maps December to Q4 start", () => {
    expect(monthToQuarterStart("2025-12-01")).toBe("2025-10-01");
  });
});

// ---------------------------------------------------------------------------
// toAnnualStart
// ---------------------------------------------------------------------------

describe("toAnnualStart", () => {
  it("maps any month to January 1 of the same year", () => {
    expect(toAnnualStart("2025-06-01")).toBe("2025-01-01");
  });

  it("maps January to January 1", () => {
    expect(toAnnualStart("2025-01-15")).toBe("2025-01-01");
  });

  it("maps December to January 1", () => {
    expect(toAnnualStart("2025-12-31")).toBe("2025-01-01");
  });
});

// ---------------------------------------------------------------------------
// computeRollups
// ---------------------------------------------------------------------------

describe("computeRollups", () => {
  it("returns empty array for monthly target", () => {
    const metrics = [makeMonthly("Revenue", "2025-01-01", 1000)];
    expect(computeRollups(metrics, "monthly")).toEqual([]);
  });

  it("computes quarterly sum for a flow metric with all 3 months", () => {
    const metrics = [
      makeMonthly("Revenue", "2025-01-01", 1000),
      makeMonthly("Revenue", "2025-02-01", 2000),
      makeMonthly("Revenue", "2025-03-01", 3000),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].metric_name).toBe("Revenue");
    expect(rollups[0].value).toBe(6000);
    expect(rollups[0].aggregationType).toBe("sum");
    expect(rollups[0].period_start).toBe("2025-01-01");
    expect(rollups[0].period_type).toBe("quarterly");
    expect(rollups[0].source).toBe("rollup");
  });

  it("skips quarterly sum when fewer than 3 months for flow metric", () => {
    const metrics = [
      makeMonthly("Revenue", "2025-01-01", 1000),
      makeMonthly("Revenue", "2025-02-01", 2000),
      // Missing March
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(0);
  });

  it("computes quarterly latest for a point-in-time metric", () => {
    const metrics = [
      makeMonthly("ARR", "2025-01-01", 100000),
      makeMonthly("ARR", "2025-02-01", 110000),
      makeMonthly("ARR", "2025-03-01", 120000),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].value).toBe(120000); // Latest = March
    expect(rollups[0].aggregationType).toBe("latest");
  });

  it("requires last month of quarter for latest aggregation", () => {
    // ARR only has Jan and Feb, missing March (last month of Q1)
    const metrics = [
      makeMonthly("ARR", "2025-01-01", 100000),
      makeMonthly("ARR", "2025-02-01", 110000),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    // latest needs the last child period (March), so no rollup
    expect(rollups).toHaveLength(0);
  });

  it("skips rollup if submitted value already exists at target level", () => {
    const metrics = [
      makeMonthly("Revenue", "2025-01-01", 1000),
      makeMonthly("Revenue", "2025-02-01", 2000),
      makeMonthly("Revenue", "2025-03-01", 3000),
      // Already submitted quarterly value
      makeQuarterly("Revenue", "2025-01-01", 5500),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(0);
  });

  it("handles multiple quarters independently", () => {
    const metrics = [
      // Q1
      makeMonthly("Revenue", "2025-01-01", 100),
      makeMonthly("Revenue", "2025-02-01", 200),
      makeMonthly("Revenue", "2025-03-01", 300),
      // Q2
      makeMonthly("Revenue", "2025-04-01", 400),
      makeMonthly("Revenue", "2025-05-01", 500),
      makeMonthly("Revenue", "2025-06-01", 600),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(2);
    const q1 = rollups.find((r) => r.period_start === "2025-01-01");
    const q2 = rollups.find((r) => r.period_start === "2025-04-01");
    expect(q1?.value).toBe(600);
    expect(q2?.value).toBe(1500);
  });

  it("computes annual rollup from quarterly source when available", () => {
    const metrics = [
      makeQuarterly("Revenue", "2025-01-01", 1000),
      makeQuarterly("Revenue", "2025-04-01", 2000),
      makeQuarterly("Revenue", "2025-07-01", 3000),
      makeQuarterly("Revenue", "2025-10-01", 4000),
    ];
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].value).toBe(10000);
    expect(rollups[0].aggregationType).toBe("sum");
    expect(rollups[0].expectedChildCount).toBe(4);
  });

  it("computes annual rollup from monthly source when no quarterly data", () => {
    // All 12 months of revenue
    const metrics = Array.from({ length: 12 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return makeMonthly("Revenue", `2025-${month}-01`, 1000);
    });
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].value).toBe(12000);
    expect(rollups[0].expectedChildCount).toBe(12);
  });

  it("skips annual rollup from monthly when fewer than 12 months for flow", () => {
    const metrics = Array.from({ length: 6 }, (_, i) => {
      const month = String(i + 1).padStart(2, "0");
      return makeMonthly("Revenue", `2025-${month}-01`, 1000);
    });
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(0);
  });

  it("skips annual rollup if submitted value already exists", () => {
    const metrics = [
      makeQuarterly("Revenue", "2025-01-01", 1000),
      makeQuarterly("Revenue", "2025-04-01", 2000),
      makeQuarterly("Revenue", "2025-07-01", 3000),
      makeQuarterly("Revenue", "2025-10-01", 4000),
      makeAnnual("Revenue", "2025-01-01", 9999),
    ];
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(0);
  });

  it("computes annual latest from quarterly (uses Q4 value)", () => {
    const metrics = [
      makeQuarterly("ARR", "2025-01-01", 100000),
      makeQuarterly("ARR", "2025-04-01", 120000),
      makeQuarterly("ARR", "2025-07-01", 140000),
      makeQuarterly("ARR", "2025-10-01", 160000),
    ];
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].value).toBe(160000); // Q4 latest
    expect(rollups[0].aggregationType).toBe("latest");
  });

  it("handles mixed metric types (flow + point-in-time) together", () => {
    const metrics = [
      makeMonthly("Revenue", "2025-01-01", 100),
      makeMonthly("Revenue", "2025-02-01", 200),
      makeMonthly("Revenue", "2025-03-01", 300),
      makeMonthly("ARR", "2025-01-01", 10000),
      makeMonthly("ARR", "2025-02-01", 11000),
      makeMonthly("ARR", "2025-03-01", 12000),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(2);
    const revRollup = rollups.find((r) => r.metric_name === "Revenue");
    const arrRollup = rollups.find((r) => r.metric_name === "ARR");
    expect(revRollup?.value).toBe(600);
    expect(revRollup?.aggregationType).toBe("sum");
    expect(arrRollup?.value).toBe(12000);
    expect(arrRollup?.aggregationType).toBe("latest");
  });

  it("sets correct period_end for quarterly rollup", () => {
    const metrics = [
      makeMonthly("ARR", "2025-04-01", 100),
      makeMonthly("ARR", "2025-05-01", 110),
      makeMonthly("ARR", "2025-06-01", 120),
    ];
    const rollups = computeRollups(metrics, "quarterly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].period_start).toBe("2025-04-01");
    expect(rollups[0].period_end).toBe("2025-06-30");
  });

  it("sets correct period_end for annual rollup", () => {
    const metrics = [
      makeQuarterly("ARR", "2025-01-01", 100),
      makeQuarterly("ARR", "2025-04-01", 110),
      makeQuarterly("ARR", "2025-07-01", 120),
      makeQuarterly("ARR", "2025-10-01", 130),
    ];
    const rollups = computeRollups(metrics, "yearly");
    expect(rollups).toHaveLength(1);
    expect(rollups[0].period_end).toBe("2025-12-31");
  });
});

// ---------------------------------------------------------------------------
// buildRollupDetail
// ---------------------------------------------------------------------------

describe("buildRollupDetail", () => {
  it("returns sum detail for flow metric quarterly rollup", () => {
    const sourceMetrics: MetricInput[] = [
      makeMonthly("Revenue", "2025-01-01", 1000),
      makeMonthly("Revenue", "2025-02-01", 2000),
      makeMonthly("Revenue", "2025-03-01", 3000),
    ];
    const rollup: RolledUpValue = {
      metric_name: "Revenue",
      period_type: "quarterly",
      period_start: "2025-01-01",
      period_end: "2025-03-31",
      value: 6000,
      source: "rollup",
      aggregationType: "sum",
      childCount: 3,
      expectedChildCount: 3,
    };
    const detail = buildRollupDetail(rollup, sourceMetrics);
    expect(detail).toBe("Sum of Jan '25, Feb '25, Mar '25");
  });

  it("returns latest detail for point-in-time quarterly rollup", () => {
    const sourceMetrics: MetricInput[] = [
      makeMonthly("ARR", "2025-01-01", 100000),
      makeMonthly("ARR", "2025-02-01", 110000),
      makeMonthly("ARR", "2025-03-01", 120000),
    ];
    const rollup: RolledUpValue = {
      metric_name: "ARR",
      period_type: "quarterly",
      period_start: "2025-01-01",
      period_end: "2025-03-31",
      value: 120000,
      source: "rollup",
      aggregationType: "latest",
      childCount: 1,
      expectedChildCount: 3,
    };
    const detail = buildRollupDetail(rollup, sourceMetrics);
    expect(detail).toBe("Latest: Mar '25");
  });

  it("returns latest detail for annual rollup from quarterly", () => {
    const sourceMetrics: MetricInput[] = [
      makeQuarterly("ARR", "2025-01-01", 100000),
      makeQuarterly("ARR", "2025-10-01", 160000),
    ];
    const rollup: RolledUpValue = {
      metric_name: "ARR",
      period_type: "annual",
      period_start: "2025-01-01",
      period_end: "2025-12-31",
      value: 160000,
      source: "rollup",
      aggregationType: "latest",
      childCount: 1,
      expectedChildCount: 4,
    };
    const detail = buildRollupDetail(rollup, sourceMetrics);
    // latest for annual from quarterly: Q4 '25
    expect(detail).toBe("Latest: Q4 '25");
  });

  it("returns sum detail for annual rollup from quarterly", () => {
    const sourceMetrics: MetricInput[] = [
      makeQuarterly("Revenue", "2025-01-01", 1000),
      makeQuarterly("Revenue", "2025-04-01", 2000),
      makeQuarterly("Revenue", "2025-07-01", 3000),
      makeQuarterly("Revenue", "2025-10-01", 4000),
    ];
    const rollup: RolledUpValue = {
      metric_name: "Revenue",
      period_type: "annual",
      period_start: "2025-01-01",
      period_end: "2025-12-31",
      value: 10000,
      source: "rollup",
      aggregationType: "sum",
      childCount: 4,
      expectedChildCount: 4,
    };
    const detail = buildRollupDetail(rollup, sourceMetrics);
    expect(detail).toBe("Sum of Q1 '25, Q2 '25, Q3 '25, Q4 '25");
  });
});

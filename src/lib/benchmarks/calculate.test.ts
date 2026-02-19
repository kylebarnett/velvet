import { describe, it, expect } from "vitest";
import {
  calculatePercentiles,
  getCompanyPercentile,
  getPercentileColor,
  getPercentileBgColor,
  type PercentileResult,
} from "./calculate";

// ---------------------------------------------------------------------------
// calculatePercentiles
// ---------------------------------------------------------------------------

describe("calculatePercentiles", () => {
  it("returns null for fewer than 5 values", () => {
    expect(calculatePercentiles([])).toBeNull();
    expect(calculatePercentiles([1])).toBeNull();
    expect(calculatePercentiles([1, 2])).toBeNull();
    expect(calculatePercentiles([1, 2, 3])).toBeNull();
    expect(calculatePercentiles([1, 2, 3, 4])).toBeNull();
  });

  it("calculates percentiles for exactly 5 values", () => {
    // Sorted: [10, 20, 30, 40, 50]
    // R-7: index = (n-1)*p
    // p25: index=1.0 => 20
    // p50: index=2.0 => 30
    // p75: index=3.0 => 40
    // p90: index=3.6 => 40 + 0.6*(50-40) = 46
    const result = calculatePercentiles([10, 20, 30, 40, 50]);
    expect(result).not.toBeNull();
    expect(result!.p25).toBe(20);
    expect(result!.p50).toBe(30);
    expect(result!.p75).toBe(40);
    expect(result!.p90).toBeCloseTo(46, 6);
  });

  it("calculates percentiles for 10 values with known distribution", () => {
    // Sorted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    // R-7: index = (10-1)*p = 9*p
    // p25: 9*0.25=2.25 => 3 + 0.25*(4-3) = 3.25
    // p50: 9*0.5 =4.5  => 5 + 0.5*(6-5)  = 5.5
    // p75: 9*0.75=6.75 => 7 + 0.75*(8-7) = 7.75
    // p90: 9*0.9 =8.1  => 9 + 0.1*(10-9) = 9.1
    const result = calculatePercentiles([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(result).not.toBeNull();
    expect(result!.p25).toBeCloseTo(3.25, 6);
    expect(result!.p50).toBeCloseTo(5.5, 6);
    expect(result!.p75).toBeCloseTo(7.75, 6);
    expect(result!.p90).toBeCloseTo(9.1, 6);
  });

  it("handles unsorted input", () => {
    const result = calculatePercentiles([50, 10, 40, 20, 30]);
    expect(result).not.toBeNull();
    expect(result!.p50).toBe(30);
  });

  it("handles identical values", () => {
    const result = calculatePercentiles([5, 5, 5, 5, 5]);
    expect(result).not.toBeNull();
    expect(result!.p25).toBe(5);
    expect(result!.p50).toBe(5);
    expect(result!.p75).toBe(5);
    expect(result!.p90).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getCompanyPercentile
// ---------------------------------------------------------------------------

describe("getCompanyPercentile", () => {
  // Benchmark: p25=20, p50=30, p75=40, p90=46
  const benchmark: PercentileResult = { p25: 20, p50: 30, p75: 40, p90: 46 };

  it("returns 0 for a value below the estimated 0th percentile", () => {
    // estimated 0th = p25 - 1.5*IQR = 20 - 1.5*(40-20) = 20 - 30 = -10
    expect(getCompanyPercentile(-20, benchmark)).toBe(0);
  });

  it("returns 100 for a value above the estimated 100th percentile", () => {
    // estimated 100th = p90 + (p90-p75) = 46 + 6 = 52
    expect(getCompanyPercentile(60, benchmark)).toBe(100);
  });

  it("returns 50 for a value at the median", () => {
    expect(getCompanyPercentile(30, benchmark)).toBe(50);
  });

  it("returns 25 for a value at p25", () => {
    expect(getCompanyPercentile(20, benchmark)).toBe(25);
  });

  it("returns 75 for a value at p75", () => {
    expect(getCompanyPercentile(40, benchmark)).toBe(75);
  });

  it("returns 90 for a value at p90", () => {
    expect(getCompanyPercentile(46, benchmark)).toBe(90);
  });

  it("interpolates between breakpoints", () => {
    // Between p25 (20) and p50 (30): midpoint 25 => should be ~37-38
    const percentile = getCompanyPercentile(25, benchmark);
    expect(percentile).toBeGreaterThan(25);
    expect(percentile).toBeLessThan(50);
  });
});

// ---------------------------------------------------------------------------
// getPercentileColor
// ---------------------------------------------------------------------------

describe("getPercentileColor", () => {
  it("returns error accent color for percentile < 25", () => {
    expect(getPercentileColor(0)).toBe("text-[var(--error-accent)]");
    expect(getPercentileColor(24)).toBe("text-[var(--error-accent)]");
  });

  it("returns warning accent color for percentile 25-49", () => {
    expect(getPercentileColor(25)).toBe("text-[var(--warning-accent)]");
    expect(getPercentileColor(49)).toBe("text-[var(--warning-accent)]");
  });

  it("returns info accent color for percentile 50-74", () => {
    expect(getPercentileColor(50)).toBe("text-[var(--info-accent)]");
    expect(getPercentileColor(74)).toBe("text-[var(--info-accent)]");
  });

  it("returns data-positive color for percentile >= 75", () => {
    expect(getPercentileColor(75)).toBe("text-[var(--data-positive)]");
    expect(getPercentileColor(100)).toBe("text-[var(--data-positive)]");
  });
});

// ---------------------------------------------------------------------------
// getPercentileBgColor
// ---------------------------------------------------------------------------

describe("getPercentileBgColor", () => {
  it("returns error bg/text for percentile < 25", () => {
    const result = getPercentileBgColor(10);
    expect(result).toContain("status-error-bg");
    expect(result).toContain("status-error-text");
  });

  it("returns warning bg/text for percentile 25-49", () => {
    const result = getPercentileBgColor(30);
    expect(result).toContain("status-warning-bg");
    expect(result).toContain("status-warning-text");
  });

  it("returns info bg/text for percentile 50-74", () => {
    const result = getPercentileBgColor(60);
    expect(result).toContain("status-info-bg");
    expect(result).toContain("status-info-text");
  });

  it("returns success bg/text for percentile >= 75", () => {
    const result = getPercentileBgColor(80);
    expect(result).toContain("status-success-bg");
    expect(result).toContain("status-success-text");
  });
});

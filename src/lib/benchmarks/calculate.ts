/**
 * Benchmark calculation utilities.
 *
 * Provides percentile computation with linear interpolation, company ranking,
 * and colour helpers for the benchmarking UI.
 */

export type PercentileResult = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
};

/**
 * Calculate percentile values from an array of numbers using linear
 * interpolation (the "R-7" / Excel PERCENTILE.INC method).
 *
 * Returns `null` when fewer than 5 values are supplied — not enough data for
 * meaningful percentiles.
 */
export function calculatePercentiles(
  values: number[],
): PercentileResult | null {
  if (values.length < 5) return null;

  const sorted = [...values].sort((a, b) => a - b);

  function percentile(p: number): number {
    // R-7 interpolation: index = (n - 1) * p
    const index = (sorted.length - 1) * p;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    const fraction = index - lower;
    return sorted[lower] + fraction * (sorted[upper] - sorted[lower]);
  }

  return {
    p25: percentile(0.25),
    p50: percentile(0.5),
    p75: percentile(0.75),
    p90: percentile(0.9),
  };
}

/**
 * Estimate the percentile rank (0-100) of a given value within a benchmark
 * distribution using linear interpolation between the known percentile
 * breakpoints.
 *
 * Breakpoints used: 0th = min estimate (p25 - 1.5 * IQR, floored at 0 only
 * for strictly non-negative distributions), p25, p50, p75, p90, 100th = p90
 * ceiling estimate.
 */
export function getCompanyPercentile(
  value: number,
  benchmark: PercentileResult,
): number {
  const { p25, p50, p75, p90 } = benchmark;

  // Known breakpoints in ascending order (percentile, value)
  const points: [number, number][] = [
    [0, p25 - 1.5 * (p75 - p25)], // estimated 0th percentile
    [25, p25],
    [50, p50],
    [75, p75],
    [90, p90],
    [100, p90 + (p90 - p75)], // estimated 100th percentile
  ];

  // Clamp to 0-100
  if (value <= points[0][1]) return 0;
  if (value >= points[points.length - 1][1]) return 100;

  // Linear interpolation between adjacent breakpoints
  for (let i = 0; i < points.length - 1; i++) {
    const [pLow, vLow] = points[i];
    const [pHigh, vHigh] = points[i + 1];

    if (value >= vLow && value <= vHigh) {
      if (vHigh === vLow) return pLow; // avoid division by zero
      const fraction = (value - vLow) / (vHigh - vLow);
      return Math.round(pLow + fraction * (pHigh - pLow));
    }
  }

  return 50; // fallback
}

/**
 * Return a Tailwind text colour class corresponding to a percentile rank.
 */
export function getPercentileColor(percentile: number): string {
  if (percentile < 25) return "text-red-400";
  if (percentile < 50) return "text-amber-400";
  if (percentile < 75) return "text-blue-400";
  return "text-emerald-400";
}

/**
 * Return Tailwind background-badge classes corresponding to a percentile rank.
 */
export function getPercentileBgColor(percentile: number): string {
  if (percentile < 25) return "bg-red-500/20 text-red-200";
  if (percentile < 50) return "bg-amber-500/20 text-amber-200";
  if (percentile < 75) return "bg-blue-500/20 text-blue-200";
  return "bg-emerald-500/20 text-emerald-200";
}

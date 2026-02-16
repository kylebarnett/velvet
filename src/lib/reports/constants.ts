/** Revenue-like metrics prioritized for default selection (case-insensitive match). */
export const REVENUE_PRIORITY_METRICS = [
  "mrr",
  "arr",
  "revenue",
  "net revenue",
  "gmv",
  "burn rate",
  "headcount",
  "runway",
];

/**
 * Pick the best default metric from an available list using revenue-priority order.
 * Falls back to the first available metric, or empty string if none.
 */
export function findDefaultMetric(available: string[]): string {
  const lower = available.map((m) => m.toLowerCase());
  for (const preferred of REVENUE_PRIORITY_METRICS) {
    const idx = lower.indexOf(preferred);
    if (idx !== -1) return available[idx];
  }
  return available[0] ?? "";
}

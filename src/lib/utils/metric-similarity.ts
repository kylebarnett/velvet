/**
 * Metric name similarity detection with synonym groups and fuzzy matching.
 * Used to warn investors when adding metrics that duplicate or overlap existing ones.
 */

// ---------------------------------------------------------------------------
// Synonym groups — metrics within a group are considered equivalent
// ---------------------------------------------------------------------------

export const METRIC_SYNONYM_GROUPS: string[][] = [
  ["burn rate", "net burn rate", "monthly burn", "cash burn", "net burn"],
  ["cash balance", "cash on hand", "cash position", "bank balance"],
  ["revenue", "total revenue", "net revenue", "gross revenue", "net sales"],
  ["mrr", "monthly recurring revenue"],
  ["arr", "annual recurring revenue"],
  ["cac", "customer acquisition cost"],
  ["ltv", "customer lifetime value", "cltv"],
  ["headcount", "team size", "employees", "ftes", "head count"],
  ["arpu", "average revenue per user"],
  ["gmv", "gross merchandise value"],
  ["aov", "average order value"],
  ["nps", "net promoter score"],
  ["dau", "daily active users"],
  ["wau", "weekly active users"],
  ["mau", "monthly active users"],
  ["gross burn", "gross burn rate"],
  ["churn rate", "customer churn rate"],
  ["gross margin", "gross margin %"],
  ["ebitda", "earnings before interest taxes depreciation and amortization"],
];

// Pre-build a lookup from normalized name → group index for O(1) synonym checks
const synonymLookup = new Map<string, number>();
METRIC_SYNONYM_GROUPS.forEach((group, idx) => {
  group.forEach((name) => {
    synonymLookup.set(name.toLowerCase(), idx);
  });
});

// ---------------------------------------------------------------------------
// Normalize a metric name for comparison
// ---------------------------------------------------------------------------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

// ---------------------------------------------------------------------------
// Dice coefficient for fuzzy string matching
// ---------------------------------------------------------------------------

function diceBigrams(s: string): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i < s.length - 1; i++) {
    result.add(s.slice(i, i + 2));
  }
  return result;
}

function diceCoefficient(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) {
    return Math.min(na.length, nb.length) / Math.max(na.length, nb.length);
  }

  const aBigrams = diceBigrams(na);
  const bBigrams = diceBigrams(nb);
  let overlap = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) overlap++;
  }

  return (2 * overlap) / (aBigrams.size + bBigrams.size);
}

// ---------------------------------------------------------------------------
// Check if two metric names are in the same synonym group
// ---------------------------------------------------------------------------

function areSynonyms(a: string, b: string): boolean {
  const aGroup = synonymLookup.get(a.toLowerCase());
  const bGroup = synonymLookup.get(b.toLowerCase());
  if (aGroup === undefined || bGroup === undefined) return false;
  return aGroup === bGroup;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute similarity between two metric names.
 * Returns 1.0 for exact or synonym matches, otherwise Dice coefficient.
 */
export function metricSimilarity(a: string, b: string): number {
  if (a.toLowerCase().trim() === b.toLowerCase().trim()) return 1.0;
  if (areSynonyms(a, b)) return 1.0;
  return diceCoefficient(a, b);
}

export type MetricConflict = {
  type: "exact" | "synonym" | "fuzzy";
  matchedName: string;
  score: number;
};

/**
 * Check a candidate metric name against existing metric names.
 * Returns conflicts sorted by severity (exact > synonym > fuzzy).
 */
export function checkMetricConflicts(
  candidateName: string,
  existingNames: string[],
): MetricConflict[] {
  const conflicts: MetricConflict[] = [];
  const candidateLower = candidateName.toLowerCase().trim();

  for (const existing of existingNames) {
    const existingLower = existing.toLowerCase().trim();

    // Exact match (case-insensitive)
    if (candidateLower === existingLower) {
      conflicts.push({ type: "exact", matchedName: existing, score: 1.0 });
      continue;
    }

    // Synonym match
    if (areSynonyms(candidateName, existing)) {
      conflicts.push({ type: "synonym", matchedName: existing, score: 1.0 });
      continue;
    }

    // Fuzzy match
    const score = diceCoefficient(candidateName, existing);
    if (score > 0.6) {
      conflicts.push({ type: "fuzzy", matchedName: existing, score });
    }
  }

  // Sort: exact first, then synonym, then fuzzy (by descending score)
  const typePriority = { exact: 0, synonym: 1, fuzzy: 2 };
  conflicts.sort((a, b) => {
    const pDiff = typePriority[a.type] - typePriority[b.type];
    if (pDiff !== 0) return pDiff;
    return b.score - a.score;
  });

  return conflicts;
}

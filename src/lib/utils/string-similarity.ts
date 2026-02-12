/**
 * Simple fuzzy match: lowercase, strip common suffixes, compare.
 * Returns a 0-1 similarity score.
 */
export function similarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(
        /\b(inc|llc|ltd|corp|co|company|technologies|tech|group|holdings)\b\.?/gi,
        "",
      )
      .replace(/[^a-z0-9]/g, "")
      .trim();

  const na = normalize(a);
  const nb = normalize(b);

  if (!na || !nb) return 0;
  if (na === nb) return 1;

  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) {
    const shorter = Math.min(na.length, nb.length);
    const longer = Math.max(na.length, nb.length);
    return shorter / longer;
  }

  // Simple character overlap (Dice coefficient)
  const bigrams = (s: string): Set<string> => {
    const result = new Set<string>();
    for (let i = 0; i < s.length - 1; i++) {
      result.add(s.slice(i, i + 2));
    }
    return result;
  };

  const aBigrams = bigrams(na);
  const bBigrams = bigrams(nb);
  let overlap = 0;
  for (const bg of aBigrams) {
    if (bBigrams.has(bg)) overlap++;
  }

  return (2 * overlap) / (aBigrams.size + bBigrams.size);
}

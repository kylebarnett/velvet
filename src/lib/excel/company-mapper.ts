import type { CompanyMatch, DetectedCompany } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Simple fuzzy match: lowercase, strip common suffixes, compare.
 * Returns a 0-1 similarity score.
 */
function similarity(a: string, b: string): number {
  const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|co|company|technologies|tech|group|holdings)\b\.?/gi, "")
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

/**
 * Map detected company names to portfolio companies for an investor.
 */
export async function mapCompaniesForInvestor(
  supabase: SupabaseClient,
  investorId: string,
  detectedCompanies: DetectedCompany[],
): Promise<CompanyMatch[]> {
  if (detectedCompanies.length === 0) return [];

  // Fetch investor's portfolio companies
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies(id, name)")
    .eq("investor_id", investorId)
    .in("approval_status", ["auto_approved", "approved"]);

  const portfolioCompanies: Array<{ id: string; name: string }> = [];
  for (const rel of relationships ?? []) {
    const company = Array.isArray(rel.companies) ? rel.companies[0] : rel.companies;
    if (company?.id && company?.name) {
      portfolioCompanies.push({ id: company.id, name: company.name });
    }
  }

  // Match each detected name against portfolio companies
  return detectedCompanies.map((detected): CompanyMatch => {
    let bestMatch: { id: string; name: string } | null = null;
    let bestScore = 0;

    for (const pc of portfolioCompanies) {
      const score = similarity(detected.name, pc.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = pc;
      }
    }

    // Auto-match threshold: 0.8+ similarity
    const autoMatched = bestScore >= 0.8;

    return {
      detectedName: detected.name,
      companyId: autoMatched && bestMatch ? bestMatch.id : null,
      companyName: bestMatch ? bestMatch.name : null,
      confidence: bestScore,
      autoMatched,
    };
  });
}

/**
 * Map all values to a single company for founders.
 */
export async function mapCompanyForFounder(
  supabase: SupabaseClient,
  founderId: string,
): Promise<{ companyId: string; companyName: string } | null> {
  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("founder_id", founderId)
    .maybeSingle();

  if (!company) return null;
  return { companyId: company.id, companyName: company.name };
}

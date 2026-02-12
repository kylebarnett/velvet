import type { CompanyMatch, DetectedCompany } from "./types";
import type { SupabaseClient } from "@supabase/supabase-js";
import { similarity } from "@/lib/utils/string-similarity";

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

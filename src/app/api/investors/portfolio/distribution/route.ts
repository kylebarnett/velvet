import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// Display labels for tag values
const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "Other",
};

const STAGE_LABELS: Record<string, string> = {
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
};

const BUSINESS_MODEL_LABELS: Record<string, string> = {
  b2b: "B2B",
  b2c: "B2C",
  b2b2c: "B2B2C",
  marketplace: "Marketplace",
  other: "Other",
};

// GET - Portfolio distribution by industry, stage, and business model
export async function GET(_req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Get all approved company relationships with company data
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      approval_status,
      companies (
        id,
        name,
        industry,
        stage,
        business_model
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) return jsonError(relError.message, 500);

  // Count companies by each dimension
  const industryCounts = new Map<string, number>();
  const stageCounts = new Map<string, number>();
  const businessModelCounts = new Map<string, number>();

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as { industry: string | null; stage: string | null; business_model: string | null } | undefined)
      : (companyRaw as { industry: string | null; stage: string | null; business_model: string | null } | null);

    if (!company) continue;

    // Count by industry
    const industry = company.industry ?? "unspecified";
    industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    // Count by stage
    const stage = company.stage ?? "unspecified";
    stageCounts.set(stage, (stageCounts.get(stage) ?? 0) + 1);

    // Count by business model
    const businessModel = company.business_model ?? "unspecified";
    businessModelCounts.set(businessModel, (businessModelCounts.get(businessModel) ?? 0) + 1);
  }

  // Format as arrays for charts
  const byIndustry = [...industryCounts.entries()]
    .map(([key, value]) => ({
      name: INDUSTRY_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  const byStage = [...stageCounts.entries()]
    .map(([key, value]) => ({
      name: STAGE_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => {
      // Sort stages by typical order
      const stageOrder = ["seed", "series_a", "series_b", "series_c", "growth", "unspecified"];
      return stageOrder.indexOf(a.key) - stageOrder.indexOf(b.key);
    });

  const byBusinessModel = [...businessModelCounts.entries()]
    .map(([key, value]) => ({
      name: BUSINESS_MODEL_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1),
      value,
      key,
    }))
    .sort((a, b) => b.value - a.value);

  return NextResponse.json(
    {
      totalCompanies: relationships?.length ?? 0,
      byIndustry,
      byStage,
      byBusinessModel,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

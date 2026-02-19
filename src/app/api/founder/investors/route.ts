import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

// GET - List investors linked to the founder's company with approval status
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company with data counts for approval context
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  // Get all investor relationships for this company
  const { data: relationships, error } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      investor_id,
      approval_status,
      is_inviting_investor,
      created_at,
      users!investor_company_relationships_investor_id_fkey (
        id,
        email,
        full_name
      )
    `)
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("Failed to fetch founder investors:", error.message);
    return jsonError("Failed to process request.", 500);
  }

  // Fetch org names for investors via organization_members
  const investorIds = (relationships ?? [])
    .map((r) => {
      const u = Array.isArray(r.users) ? r.users[0] : r.users;
      return u?.id;
    })
    .filter(Boolean) as string[];

  const orgMap: Record<string, { name: string; logoUrl: string | null }> = {};

  if (investorIds.length > 0) {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("user_id, organizations(name, logo_url)")
      .in("user_id", investorIds);

    if (memberships) {
      for (const m of memberships) {
        const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
        if (org?.name) {
          orgMap[m.user_id] = { name: org.name, logoUrl: org.logo_url ?? null };
        }
      }
    }
  }

  // Attach org_name and org_logo_url to each relationship
  const enriched = (relationships ?? []).map((r) => {
    const u = Array.isArray(r.users) ? r.users[0] : r.users;
    const orgInfo = u?.id ? orgMap[u.id] : null;
    return {
      ...r,
      org_name: orgInfo?.name ?? null,
      org_logo_url: orgInfo?.logoUrl ?? null,
    };
  });

  // Fetch data counts for approval context
  const [metricResult, docResult, tearSheetResult] = await Promise.all([
    supabase
      .from("company_metric_values")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
    supabase
      .from("tear_sheets")
      .select("id", { count: "exact", head: true })
      .eq("company_id", company.id),
  ]);

  const dataCounts = {
    metrics: metricResult.count ?? 0,
    documents: docResult.count ?? 0,
    tearSheets: tearSheetResult.count ?? 0,
  };

  return NextResponse.json({ investors: enriched, dataCounts });
}

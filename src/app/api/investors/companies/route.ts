import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List all companies in investor's portfolio with tags
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { data: relationships, error } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      approval_status,
      is_inviting_investor,
      logo_url,
      companies (
        id,
        name,
        website,
        founder_id,
        founder_email,
        stage,
        industry,
        business_model
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  const companies = (relationships ?? []).map((r) => ({
    relationshipId: r.id,
    approvalStatus: r.approval_status,
    isInvitingInvestor: r.is_inviting_investor,
    logoUrl: r.logo_url,
    ...(r.companies as any),
  }));

  return NextResponse.json({ companies });
}

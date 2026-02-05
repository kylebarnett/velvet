import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";

// GET - List all companies in investor's portfolio with tags
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const { limit, offset } = parsePagination(url);

  const { data: relationships, error, count } = await supabase
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
    `, { count: "exact" })
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) return jsonError(error.message, 500);

  const companies = (relationships ?? []).map((r) => {
    const company = Array.isArray(r.companies) ? r.companies[0] : r.companies;
    return {
      relationshipId: r.id,
      approvalStatus: r.approval_status,
      isInvitingInvestor: r.is_inviting_investor,
      logoUrl: r.logo_url,
      ...(company as Record<string, unknown>),
    };
  });

  return NextResponse.json(
    { companies, total: count ?? companies.length },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}

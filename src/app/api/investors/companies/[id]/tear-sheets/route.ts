import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId } = await params;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .in("approval_status", ["auto_approved", "approved"])
    .single();

  if (!relationship) {
    return jsonError("Company not in portfolio or not approved.", 403);
  }

  // Fetch published founder tear sheets for this company
  const { data: founderTearSheets, error: founderError } = await supabase
    .from("tear_sheets")
    .select("id, title, quarter, year, status, content, share_enabled, share_token, updated_at, creator_role")
    .eq("company_id", companyId)
    .eq("creator_role", "founder")
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (founderError) {
    logger.error("Failed to fetch founder tear sheets:", founderError);
    return jsonError("Failed to load tear sheets.", 500);
  }

  // Fetch investor's own tear sheets for this company (all statuses)
  const { data: investorTearSheets, error: investorError } = await supabase
    .from("tear_sheets")
    .select("id, title, quarter, year, status, content, share_enabled, share_token, updated_at, creator_role")
    .eq("company_id", companyId)
    .eq("investor_id", user.id)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (investorError) {
    logger.error("Failed to fetch investor tear sheets:", investorError);
    return jsonError("Failed to load tear sheets.", 500);
  }

  const tearSheets = [
    ...(founderTearSheets ?? []),
    ...(investorTearSheets ?? []),
  ];

  return NextResponse.json({ tearSheets });
}

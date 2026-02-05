import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";

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

  // Fetch published tear sheets for this company
  const { data: tearSheets, error } = await supabase
    .from("tear_sheets")
    .select("id, title, quarter, year, status, content, share_enabled, share_token, updated_at")
    .eq("company_id", companyId)
    .eq("status", "published")
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (error) {
    console.error("Failed to fetch tear sheets:", error);
    return jsonError("Failed to load tear sheets.", 500);
  }

  return NextResponse.json({ tearSheets: tearSheets ?? [] });
}

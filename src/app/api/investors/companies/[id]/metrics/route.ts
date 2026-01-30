import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Get all metric values for a company (investor view)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id: companyId } = await params;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id, approval_status")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  if (!["auto_approved", "approved"].includes(relationship.approval_status)) {
    return jsonError("Access pending approval.", 403);
  }

  // Fetch all metric values for this company
  const { data: metrics, error } = await supabase
    .from("company_metric_values")
    .select(`
      id,
      metric_name,
      period_type,
      period_start,
      period_end,
      value,
      notes,
      submitted_at,
      updated_at
    `)
    .eq("company_id", companyId)
    .order("period_start", { ascending: false });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    metrics: metrics ?? [],
    companyId,
  });
}

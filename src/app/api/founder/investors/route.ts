import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List investors linked to the founder's company with approval status
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company
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

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ investors: relationships ?? [] });
}

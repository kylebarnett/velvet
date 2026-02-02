import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (companyError || !company) {
    return jsonError("No company found.", 404);
  }

  // Get optional type filter from query params
  const url = new URL(req.url);
  const typeFilter = url.searchParams.get("type");

  // Build query
  let query = supabase
    .from("documents")
    .select(`
      id,
      file_name,
      file_path,
      file_type,
      file_size,
      document_type,
      description,
      ingestion_status,
      uploaded_at
    `)
    .eq("company_id", company.id)
    .order("uploaded_at", { ascending: false });

  // Apply type filter if provided
  const validTypes = [
    "income_statement",
    "balance_sheet",
    "cash_flow_statement",
    "consolidated_financial_statements",
    "409a_valuation",
    "investor_update",
    "board_deck",
    "cap_table",
    "other",
  ];
  if (typeFilter && validTypes.includes(typeFilter)) {
    query = query.eq("document_type", typeFilter);
  }

  const { data: documents, error } = await query;

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ documents: documents ?? [] });
}

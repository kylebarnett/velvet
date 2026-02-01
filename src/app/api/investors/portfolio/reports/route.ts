import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List all saved reports for the investor
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const reportType = url.searchParams.get("type"); // Optional filter by report type

  let query = supabase
    .from("portfolio_reports")
    .select("*")
    .eq("investor_id", user.id)
    .order("updated_at", { ascending: false });

  if (reportType) {
    query = query.eq("report_type", reportType);
  }

  const { data: reports, error } = await query;

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ reports: reports ?? [] });
}

// POST - Create a new saved report
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const body = await req.json();
  const {
    name,
    description,
    reportType = "summary",
    filters = {},
    companyIds = [],
    normalize = "absolute",
    config = {},
    isDefault = false,
  } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return jsonError("Report name is required.", 400);
  }

  if (!["summary", "comparison", "trend"].includes(reportType)) {
    return jsonError("Invalid report type.", 400);
  }

  const { data: report, error } = await supabase
    .from("portfolio_reports")
    .insert({
      investor_id: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      report_type: reportType,
      filters,
      company_ids: companyIds,
      normalize,
      config,
      is_default: isDefault,
    })
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ report, ok: true }, { status: 201 });
}

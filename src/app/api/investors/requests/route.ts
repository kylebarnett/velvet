import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const status = url.searchParams.get("status");
  const companyId = url.searchParams.get("companyId");
  const search = url.searchParams.get("search");
  const { limit, offset } = parsePagination(url);

  let query = supabase
    .from("metric_requests")
    .select(
      `
      id,
      period_start,
      period_end,
      status,
      due_date,
      created_at,
      company_id,
      companies (
        id,
        name
      ),
      metric_definitions (
        name,
        period_type
      )
    `,
      { count: "exact" },
    )
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  // Search by metric definition name via joined table
  if (search) {
    const escapedSearch = search
      .replace(/[%_]/g, "\\$&")
      .replace(/[(),."'\\]/g, "");
    query = query.ilike("metric_definitions.name", `%${escapedSearch}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: requests, error, count } = await query;

  if (error) return jsonError(error.message, 500);

  // Also get counts by status for summary cards
  const { data: allRequests } = await supabase
    .from("metric_requests")
    .select("status")
    .eq("investor_id", user.id);

  const statusCounts = {
    total: allRequests?.length ?? 0,
    pending: allRequests?.filter((r) => r.status === "pending").length ?? 0,
    submitted: allRequests?.filter((r) => r.status === "submitted").length ?? 0,
  };

  return NextResponse.json({
    requests: requests ?? [],
    total: count ?? 0,
    limit,
    offset,
    statusCounts,
  });
}

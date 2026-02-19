import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { logger } from "@/lib/logger";

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
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

  if (search) {
    const escapedSearch = search
      .replace(/[%_]/g, "\\$&")
      .replace(/[(),."'\\]/g, "");
    query = query.ilike("metric_definitions.name", `%${escapedSearch}%`);
  }

  query = query.range(offset, offset + limit - 1);

  const { data: requests, error, count } = await query;

  if (error) {
    logger.error("Failed to fetch requests:", error.message);
    return jsonError("Failed to fetch requests.", 500);
  }

  // Get counts by status using parallel aggregate queries (not a full re-fetch)
  const [
    { count: totalCount },
    { count: pendingCount },
    { count: submittedCount },
  ] = await Promise.all([
    supabase
      .from("metric_requests")
      .select("id", { count: "exact", head: true })
      .eq("investor_id", user.id),
    supabase
      .from("metric_requests")
      .select("id", { count: "exact", head: true })
      .eq("investor_id", user.id)
      .eq("status", "pending"),
    supabase
      .from("metric_requests")
      .select("id", { count: "exact", head: true })
      .eq("investor_id", user.id)
      .eq("status", "submitted"),
  ]);

  const statusCounts = {
    total: totalCount ?? 0,
    pending: pendingCount ?? 0,
    submitted: submittedCount ?? 0,
  };

  return NextResponse.json({
    requests: requests ?? [],
    total: count ?? 0,
    limit,
    offset,
    statusCounts,
  },
  {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

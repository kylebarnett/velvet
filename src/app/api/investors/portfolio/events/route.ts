import { NextRequest, NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

function getTimeRange(filter: string): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();

  if (filter === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to };
  }

  if (filter === "yesterday") {
    const start = new Date(now);
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(0, 0, 0, 0);
    return { from: start.toISOString(), to: end.toISOString() };
  }

  // this_week (default): last 7 days
  const start = new Date(now);
  start.setDate(start.getDate() - 7);
  return { from: start.toISOString(), to };
}

/** Escape ILIKE wildcards per CLAUDE.md security rules */
function sanitizeSearch(input: string): string {
  return input
    .replace(/%/g, "\\%")
    .replace(/_/g, "\\_")
    .replace(/[^\w\s.-]/g, "");
}

// GET - Fetch portfolio events for investor
export async function GET(req: NextRequest) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const { limit, offset } = parsePagination(url);
  const filter = url.searchParams.get("filter") ?? "this_week";
  const search = url.searchParams.get("search")?.trim() ?? "";
  const companyId = url.searchParams.get("companyId")?.trim() ?? "";

  const { from, to } = getTimeRange(filter);

  // Build query — RLS handles authorization (investor sees only approved companies' events)
  let query = supabase
    .from("portfolio_events")
    .select("id, company_id, actor_id, event_type, title, description, metadata, created_at", { count: "exact" })
    .gte("created_at", from)
    .lte("created_at", to)
    .order("created_at", { ascending: false });

  // Filter to a specific company if provided
  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  if (search) {
    const sanitized = sanitizeSearch(search);
    if (sanitized) {
      query = query.ilike("title", `%${sanitized}%`);
    }
  }

  const { data: events, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error("Failed to fetch portfolio events:", error.message);
    return jsonError("Failed to load events.", 500);
  }

  // Enrich with company names + actor names via admin client (bypasses RLS for cross-role reads)
  const companyIds = [...new Set((events ?? []).map((e) => e.company_id))];
  const actorIds = [...new Set((events ?? []).map((e) => e.actor_id).filter(Boolean))] as string[];

  const admin = createSupabaseAdminClient();

  const companyMap: Record<string, string> = {};
  if (companyIds.length > 0) {
    const { data: companies } = await admin
      .from("companies")
      .select("id, name")
      .in("id", companyIds);
    for (const c of companies ?? []) {
      companyMap[c.id] = c.name;
    }
  }

  const actorMap: Record<string, string> = {};
  if (actorIds.length > 0) {
    const { data: actors } = await admin
      .from("users")
      .select("id, full_name, email")
      .in("id", actorIds);
    for (const a of actors ?? []) {
      actorMap[a.id] = a.full_name || a.email || "User";
    }
  }

  const enriched = (events ?? []).map((e) => ({
    ...e,
    company_name: companyMap[e.company_id] ?? "Unknown company",
    actor_name: e.actor_id ? (actorMap[e.actor_id] ?? "User") : null,
  }));

  // Count today's events for badge
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  let todayQuery = supabase
    .from("portfolio_events")
    .select("id", { count: "exact", head: true })
    .gte("created_at", todayStart.toISOString());

  if (companyId) {
    todayQuery = todayQuery.eq("company_id", companyId);
  }

  const { count: todayCount } = await todayQuery;

  return NextResponse.json(
    { events: enriched, total: count ?? 0, today_count: todayCount ?? 0 },
    { headers: { "Cache-Control": "private, max-age=0" } },
  );
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { logger } from "@/lib/logger";

// GET - Fetch comments for a metric
export async function GET(req: NextRequest) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (!role || !["investor", "founder"].includes(role)) {
    return jsonError("Forbidden.", 403);
  }

  const url = new URL(req.url);
  const companyId = url.searchParams.get("company_id");
  const metricName = url.searchParams.get("metric_name");
  const periodStart = url.searchParams.get("period_start");
  const periodEnd = url.searchParams.get("period_end");

  if (!companyId || !metricName) {
    return jsonError("company_id and metric_name are required.", 400);
  }

  // Verify user has access to this company (IDOR prevention)
  if (role === "investor") {
    const { data: rel } = await supabase
      .from("investor_company_relationships")
      .select("id")
      .eq("investor_id", user.id)
      .eq("company_id", companyId)
      .in("approval_status", ["approved", "auto_approved"])
      .limit(1)
      .maybeSingle();
    if (!rel) return jsonError("Forbidden.", 403);
  } else {
    // Founder: must own the company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("founder_id", user.id)
      .maybeSingle();
    if (!company) return jsonError("Forbidden.", 403);
  }

  const { limit, offset } = parsePagination(url);

  let query = supabase
    .from("metric_comments")
    .select("id, company_id, metric_name, period_start, period_end, user_id, user_role, content, created_at")
    .eq("company_id", companyId)
    .eq("metric_name", metricName);

  // Filter to period-specific comments when period is provided
  if (periodStart && periodEnd) {
    query = query.eq("period_start", periodStart).eq("period_end", periodEnd);
  }

  const { data: comments, error } = await query
    .order("created_at", { ascending: true })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("Failed to fetch metric comments:", error.message);
    return jsonError("Failed to load comments.", 500);
  }

  // Fetch display names for comment authors
  const userIds = [...new Set((comments ?? []).map((c) => c.user_id))];
  const userMap: Record<string, string> = {};

  if (userIds.length > 0) {
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, email")
      .in("id", userIds);

    for (const u of users ?? []) {
      userMap[u.id] = u.full_name || u.email || "User";
    }
  }

  const enriched = (comments ?? []).map((c) => ({
    ...c,
    author_name: userMap[c.user_id] ?? "User",
    is_own: c.user_id === user.id,
  }));

  return NextResponse.json({ comments: enriched });
}

const createSchema = z.object({
  company_id: z.string().uuid(),
  metric_name: z.string().min(1).max(200),
  content: z.string().min(1).max(2000),
  period_start: z.string().nullable().optional(),
  period_end: z.string().nullable().optional(),
});

// POST - Create a comment
export async function POST(req: NextRequest) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (!role || !["investor", "founder"].includes(role)) {
    return jsonError("Forbidden.", 403);
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid data.", 400);

  const { company_id, metric_name, content, period_start, period_end } = parsed.data;

  // Verify user has access to this company (IDOR prevention)
  if (role === "investor") {
    const { data: rel } = await supabase
      .from("investor_company_relationships")
      .select("id")
      .eq("investor_id", user.id)
      .eq("company_id", company_id)
      .in("approval_status", ["approved", "auto_approved"])
      .limit(1)
      .maybeSingle();
    if (!rel) return jsonError("Forbidden.", 403);
  } else {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", company_id)
      .eq("founder_id", user.id)
      .maybeSingle();
    if (!company) return jsonError("Forbidden.", 403);
  }

  const { data: comment, error } = await supabase
    .from("metric_comments")
    .insert({
      company_id,
      metric_name,
      user_id: user.id,
      user_role: role,
      content: content.trim(),
      period_start: period_start ?? null,
      period_end: period_end ?? null,
    })
    .select("id, created_at")
    .single();

  if (error) {
    logger.error("Failed to create metric comment:", error.message);
    return jsonError("Failed to post comment.", 500);
  }

  return NextResponse.json({ ok: true, id: comment.id });
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

/** Enrich a list of actor IDs with names and org names using admin client (bypasses RLS for cross-role reads) */
async function enrichActorIds(actorIds: string[]) {
  const actorMap: Record<string, string> = {};
  const orgMap: Record<string, string> = {};

  if (actorIds.length === 0) return { actorMap, orgMap };

  const admin = createSupabaseAdminClient();

  // Fetch names
  const { data: actors } = await admin
    .from("users")
    .select("id, full_name, email")
    .in("id", actorIds);

  for (const a of actors ?? []) {
    actorMap[a.id] = a.full_name || a.email || "User";
  }

  // Fetch org names
  const { data: memberships } = await admin
    .from("organization_members")
    .select("user_id, organizations(name)")
    .in("user_id", actorIds);

  for (const m of memberships ?? []) {
    const org = Array.isArray(m.organizations) ? m.organizations[0] : m.organizations;
    if (org?.name) orgMap[m.user_id] = org.name;
  }

  return { actorMap, orgMap };
}

// GET - Fetch activity log for a company (founders only)
export async function GET(req: NextRequest) {
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

  const url = new URL(req.url);

  // --- Actor summary mode ---
  const actorsMode = url.searchParams.get("actors") === "true";
  if (actorsMode) {
    const { data: rows, error: actorsError } = await supabase
      .from("activity_log")
      .select("actor_id, actor_role, created_at")
      .eq("company_id", company.id);

    if (actorsError) {
      logger.error("Failed to fetch actors:", actorsError.message);
      return jsonError("Failed to load actors.", 500);
    }

    // Aggregate per actor
    const agg = new Map<string, { role: string; count: number; last_active: string }>();
    for (const r of rows ?? []) {
      const existing = agg.get(r.actor_id);
      if (!existing) {
        agg.set(r.actor_id, { role: r.actor_role, count: 1, last_active: r.created_at });
      } else {
        existing.count++;
        if (r.created_at > existing.last_active) existing.last_active = r.created_at;
      }
    }

    const actorIds = [...agg.keys()];
    const { actorMap, orgMap } = await enrichActorIds(actorIds);

    const actors = actorIds
      .map((id) => {
        const info = agg.get(id)!;
        return {
          id,
          name: actorMap[id] ?? "User",
          org: orgMap[id] ?? null,
          activity_count: info.count,
          last_active: info.last_active,
        };
      })
      .sort((a, b) => (a.last_active > b.last_active ? -1 : 1));

    return NextResponse.json({ actors });
  }

  // --- Standard activity list ---
  const { limit, offset } = parsePagination(url);

  // Optional actor_id filter
  const rawActorId = url.searchParams.get("actor_id");
  const actorIdParsed = z.string().uuid().optional().safeParse(rawActorId || undefined);
  const actorId = actorIdParsed.success ? actorIdParsed.data : undefined;

  let query = supabase
    .from("activity_log")
    .select("id, actor_id, actor_role, action, metadata, created_at", { count: "exact" })
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (actorId) {
    query = query.eq("actor_id", actorId);
  }

  const { data: activities, error, count } = await query.range(offset, offset + limit - 1);

  if (error) {
    logger.error("Failed to fetch activity log:", error.message);
    return jsonError("Failed to load activity.", 500);
  }

  const actorIds = [...new Set((activities ?? []).map((a) => a.actor_id))];
  const { actorMap, orgMap } = await enrichActorIds(actorIds);

  const enriched = (activities ?? []).map((a) => ({
    ...a,
    actor_name: actorMap[a.actor_id] ?? "User",
    actor_org: orgMap[a.actor_id] ?? null,
  }));

  return NextResponse.json({ activities: enriched, total: count ?? 0 });
}

const logSchema = z.object({
  company_id: z.string().uuid(),
  action: z.enum(["view_dashboard", "download_document", "export_metrics", "view_tear_sheet"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

// POST - Log an activity (investors only)
export async function POST(req: NextRequest) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const body = await req.json().catch(() => null);
  const parsed = logSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid data.", 400);

  const { company_id, action, metadata } = parsed.data;

  // Verify investor has approved access
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", company_id)
    .in("approval_status", ["approved", "auto_approved"])
    .single();

  if (!relationship) return jsonError("No access to this company.", 403);

  const { error } = await supabase
    .from("activity_log")
    .insert({
      company_id,
      actor_id: user.id,
      actor_role: role,
      action,
      metadata: metadata ?? {},
    });

  if (error) {
    logger.error("Failed to log activity:", error.message);
    return jsonError("Failed to log activity.", 500);
  }

  return NextResponse.json({ ok: true });
}

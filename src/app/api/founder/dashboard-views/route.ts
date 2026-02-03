import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const createSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(100),
  isDefault: z.boolean().default(false),
  layout: z.array(z.object({
    id: z.string(),
    type: z.enum(["chart", "metric-card", "table"]),
    x: z.number().min(0).max(11),
    y: z.number().min(0),
    w: z.number().min(1).max(12),
    h: z.number().min(1).max(10),
    config: z.record(z.string(), z.unknown()),
  })),
});

// GET - List dashboard views for a founder's company
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const url = new URL(req.url);
  const companyId = url.searchParams.get("companyId");

  if (!companyId) return jsonError("companyId is required.", 400);

  // Verify founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized.", 403);

  // Fetch views
  const { data: views, error } = await supabase
    .from("dashboard_views")
    .select("id, name, is_default, layout, created_at, updated_at")
    .eq("founder_id", user.id)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ views: views ?? [] });
}

// POST - Create a new dashboard view
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  const { companyId, name, isDefault, layout } = parsed.data;

  // Verify founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized.", 403);

  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from("dashboard_views")
      .update({ is_default: false })
      .eq("founder_id", user.id)
      .eq("company_id", companyId);
  }

  // Create the view
  const { data: view, error } = await supabase
    .from("dashboard_views")
    .insert({
      founder_id: user.id,
      company_id: companyId,
      name,
      is_default: isDefault,
      layout,
    })
    .select("id, name, is_default, layout, created_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("A view with this name already exists.", 409);
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ view, ok: true }, { status: 201 });
}

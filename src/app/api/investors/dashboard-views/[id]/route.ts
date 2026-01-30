import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  isDefault: z.boolean().optional(),
  layout: z.array(z.object({
    id: z.string(),
    type: z.enum(["chart", "metric-card", "table"]),
    x: z.number().min(0).max(11),
    y: z.number().min(0),
    w: z.number().min(1).max(12),
    h: z.number().min(1).max(10),
    config: z.record(z.string(), z.unknown()),
  })).optional(),
});

// GET - Get a single dashboard view
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;

  const { data: view, error } = await supabase
    .from("dashboard_views")
    .select("id, company_id, name, is_default, layout, created_at, updated_at")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error || !view) {
    return jsonError("View not found.", 404);
  }

  return NextResponse.json({ view });
}

// PUT - Update a dashboard view
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("dashboard_views")
    .select("id, company_id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("View not found.", 404);
  }

  const { name, isDefault, layout } = parsed.data;

  // If setting as default, unset other defaults first
  if (isDefault) {
    await supabase
      .from("dashboard_views")
      .update({ is_default: false })
      .eq("investor_id", user.id)
      .eq("company_id", existing.company_id)
      .neq("id", id);
  }

  // Build update object
  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (isDefault !== undefined) updateData.is_default = isDefault;
  if (layout !== undefined) updateData.layout = layout;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { data: view, error } = await supabase
    .from("dashboard_views")
    .update(updateData)
    .eq("id", id)
    .eq("investor_id", user.id)
    .select("id, name, is_default, layout, created_at, updated_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError("A view with this name already exists.", 409);
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ view, ok: true });
}

// DELETE - Delete a dashboard view
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;

  // Verify ownership
  const { data: existing } = await supabase
    .from("dashboard_views")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("View not found.", 404);
  }

  const { error } = await supabase
    .from("dashboard_views")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

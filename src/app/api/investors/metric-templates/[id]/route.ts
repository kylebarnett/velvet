import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Get a single template with items (system or owned by user)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Allow reading system templates or user's own templates
  const { data, error } = await supabase
    .from("metric_templates")
    .select(`
      id,
      name,
      description,
      is_system,
      target_industry,
      created_at,
      updated_at,
      metric_template_items (
        id,
        metric_name,
        period_type,
        data_type,
        sort_order
      )
    `)
    .eq("id", id)
    .or(`is_system.eq.true,investor_id.eq.${user.id}`)
    .single();

  if (error || !data) return jsonError("Template not found.", 404);

  // Sort items
  const template = {
    id: data.id,
    name: data.name,
    description: data.description,
    isSystem: data.is_system,
    targetIndustry: data.target_industry,
    created_at: data.created_at,
    updated_at: data.updated_at,
    metric_template_items: (data.metric_template_items ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    ),
  };

  return NextResponse.json({ template });
}

// PUT - Update template name/description and replace items
const updateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  items: z.array(
    z.object({
      metric_name: z.string().min(1),
      period_type: z.enum(["monthly", "quarterly", "annual"]),
      data_type: z.string().default("number"),
      sort_order: z.number().int().default(0),
    }),
  ).min(1),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  // Verify ownership and not a system template (use admin to bypass RLS)
  const adminClient = createSupabaseAdminClient();
  const { data: existing } = await adminClient
    .from("metric_templates")
    .select("id, is_system, investor_id")
    .eq("id", id)
    .single();

  if (!existing) return jsonError("Template not found.", 404);
  if (existing.is_system) return jsonError("Cannot edit system templates.", 403);
  if (existing.investor_id !== user.id) return jsonError("Not authorized.", 403);

  const { name, description, items } = parsed.data;

  // Update template
  const { error: updateError } = await adminClient
    .from("metric_templates")
    .update({ name, description: description ?? null })
    .eq("id", id);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  // Delete existing items
  const { error: deleteError } = await adminClient
    .from("metric_template_items")
    .delete()
    .eq("template_id", id);

  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  // Insert new items
  const newItems = items.map((item, i) => ({
    template_id: id,
    metric_name: item.metric_name,
    period_type: item.period_type,
    data_type: item.data_type,
    sort_order: item.sort_order ?? i,
  }));

  const { data: insertedItems, error: itemsError } = await adminClient
    .from("metric_template_items")
    .insert(newItems)
    .select();

  if (itemsError) {
    return jsonError(itemsError.message, 500);
  }

  return NextResponse.json({ ok: true, itemsInserted: insertedItems?.length ?? 0 });
}

// DELETE - Delete a template (cannot delete system templates)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Verify it's not a system template
  const { data: existing } = await supabase
    .from("metric_templates")
    .select("is_system")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) return jsonError("Template not found.", 404);
  if (existing.is_system) return jsonError("Cannot delete system templates.", 403);

  const { error } = await supabase
    .from("metric_templates")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

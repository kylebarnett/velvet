import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List all templates for investor (system + user templates)
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Fetch both system templates and user's own templates
  const { data, error } = await supabase
    .from("metric_templates")
    .select(`
      id,
      name,
      description,
      is_system,
      target_industry,
      investor_id,
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
    .or(`is_system.eq.true,investor_id.eq.${user.id}`)
    .order("is_system", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  // Sort items within each template and add isSystem flag
  const templates = (data ?? []).map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    isSystem: t.is_system,
    targetIndustry: t.target_industry,
    created_at: t.created_at,
    updated_at: t.updated_at,
    metric_template_items: (t.metric_template_items ?? []).sort(
      (a: any, b: any) => a.sort_order - b.sort_order,
    ),
  }));

  return NextResponse.json({ templates });
}

// POST - Create a new template
const createSchema = z.object({
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

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { name, description, items } = parsed.data;

  // Create template
  const { data: template, error: templateError } = await supabase
    .from("metric_templates")
    .insert({
      investor_id: user.id,
      name,
      description: description ?? null,
    })
    .select("id")
    .single();

  if (templateError) return jsonError(templateError.message, 400);

  // Create items
  const { error: itemsError } = await supabase
    .from("metric_template_items")
    .insert(
      items.map((item, i) => ({
        template_id: template.id,
        metric_name: item.metric_name,
        period_type: item.period_type,
        data_type: item.data_type,
        sort_order: item.sort_order ?? i,
      })),
    );

  if (itemsError) {
    // Cleanup template on item insert failure
    await supabase.from("metric_templates").delete().eq("id", template.id);
    return jsonError(itemsError.message, 400);
  }

  return NextResponse.json({ id: template.id, ok: true });
}

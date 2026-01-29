import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const cloneSchema = z.object({
  sourceTemplateId: z.string().min(1),
  newName: z.string().min(1).optional(),
});

// POST - Clone a template (system or owned) to user's personal templates
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = cloneSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { sourceTemplateId, newName } = parsed.data;

  // Fetch source template (must be system OR owned by user)
  const { data: sourceTemplate, error: fetchError } = await supabase
    .from("metric_templates")
    .select(`
      id,
      name,
      description,
      is_system,
      target_industry,
      metric_template_items (
        metric_name,
        period_type,
        data_type,
        sort_order
      )
    `)
    .eq("id", sourceTemplateId)
    .or(`is_system.eq.true,investor_id.eq.${user.id}`)
    .single();

  if (fetchError || !sourceTemplate) {
    return jsonError("Source template not found.", 404);
  }

  // Create new template owned by user
  const clonedName = newName || `Copy of ${sourceTemplate.name}`;

  const { data: newTemplate, error: createError } = await supabase
    .from("metric_templates")
    .insert({
      investor_id: user.id,
      name: clonedName,
      description: sourceTemplate.description,
      is_system: false,
      target_industry: sourceTemplate.target_industry,
    })
    .select("id")
    .single();

  if (createError) {
    return jsonError(createError.message, 500);
  }

  // Copy all template items
  const items = sourceTemplate.metric_template_items ?? [];
  if (items.length > 0) {
    const { error: itemsError } = await supabase
      .from("metric_template_items")
      .insert(
        items.map((item: any) => ({
          template_id: newTemplate.id,
          metric_name: item.metric_name,
          period_type: item.period_type,
          data_type: item.data_type,
          sort_order: item.sort_order,
        })),
      );

    if (itemsError) {
      // Cleanup template on item insert failure
      await supabase.from("metric_templates").delete().eq("id", newTemplate.id);
      return jsonError(itemsError.message, 500);
    }
  }

  return NextResponse.json({
    ok: true,
    id: newTemplate.id,
    name: clonedName,
  });
}

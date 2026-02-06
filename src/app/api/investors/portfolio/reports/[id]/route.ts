import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  companyIds: z.array(z.string().uuid()).optional(),
  normalize: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { data, error } = await supabase
    .from("portfolio_reports")
    .select("*")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error || !data) return jsonError("Report not found.", 404);

  return NextResponse.json({ report: data });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Verify ownership
  const { data: existing } = await supabase
    .from("portfolio_reports")
    .select("id, report_type")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) return jsonError("Report not found.", 404);

  const { name, description, filters, companyIds, normalize, config, isDefault } =
    parsed.data;

  // If setting as default, unset other defaults of the same type
  if (isDefault) {
    await supabase
      .from("portfolio_reports")
      .update({ is_default: false })
      .eq("investor_id", user.id)
      .eq("report_type", existing.report_type)
      .eq("is_default", true)
      .neq("id", id);
  }

  const updateData: Record<string, unknown> = {};
  if (name !== undefined) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (filters !== undefined) updateData.filters = filters;
  if (companyIds !== undefined) updateData.company_ids = companyIds;
  if (normalize !== undefined) updateData.normalize = normalize;
  if (config !== undefined) updateData.config = config;
  if (isDefault !== undefined) updateData.is_default = isDefault;

  const { error } = await supabase
    .from("portfolio_reports")
    .update(updateData)
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { error } = await supabase
    .from("portfolio_reports")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

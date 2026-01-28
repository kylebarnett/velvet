import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  stage: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  business_model: z.string().nullable().optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { id: companyId } = await params;

  // Verify investor has a relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  // Use admin client since investor may not have direct update on companies
  const adminClient = createSupabaseAdminClient();
  const updateData: Record<string, string | null> = {};

  if (parsed.data.stage !== undefined) updateData.stage = parsed.data.stage ?? null;
  if (parsed.data.industry !== undefined) updateData.industry = parsed.data.industry ?? null;
  if (parsed.data.business_model !== undefined)
    updateData.business_model = parsed.data.business_model ?? null;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { error } = await adminClient
    .from("companies")
    .update(updateData)
    .eq("id", companyId);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { z } from "zod";

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const { data: company, error } = await supabase
    .from("companies")
    .select("id, name, website, industry, stage, business_model")
    .eq("founder_id", user.id)
    .single();

  if (error || !company) return jsonError("No company found.", 404);

  return NextResponse.json(company);
}

const updateSchema = z.object({
  website: z.string().url().nullable().optional(),
  industry: z
    .enum(["saas", "fintech", "healthcare", "ecommerce", "edtech", "ai_ml", "other"])
    .nullable()
    .optional(),
  stage: z
    .enum(["seed", "series_a", "series_b", "series_c", "growth"])
    .nullable()
    .optional(),
  business_model: z
    .enum(["b2b", "b2c", "b2b2c", "marketplace", "other"])
    .nullable()
    .optional(),
});

export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid data.", 400);

  // Verify founder owns a company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  // Build update — only include provided fields
  const update: Record<string, string | null> = {};
  for (const [key, val] of Object.entries(parsed.data)) {
    if (val !== undefined) update[key] = val;
  }

  if (Object.keys(update).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { error } = await supabase
    .from("companies")
    .update(update)
    .eq("id", company.id);

  if (error) return jsonError("Failed to update company.", 500);

  return NextResponse.json({ ok: true });
}

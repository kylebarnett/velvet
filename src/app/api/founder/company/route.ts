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
    .select("id, name, website, industry, stage, business_model, description, founded_date, hq_location, headcount, total_funding_raised, last_round_amount, last_round_date, logo_url")
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
  description: z.string().max(2000).nullable().optional(),
  founded_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  hq_location: z.string().max(200).nullable().optional(),
  headcount: z.number().int().min(0).max(1_000_000).nullable().optional(),
  total_funding_raised: z.number().int().min(0).nullable().optional(),
  last_round_amount: z.number().int().min(0).nullable().optional(),
  last_round_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
  logo_url: z.string().url().nullable().optional(),
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
  const update: Record<string, string | number | null> = {};
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

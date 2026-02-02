import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  primaryMetric: z.string().min(1).nullable(),
  secondaryMetric: z.string().min(1).nullable().optional(),
}).refine(
  (data) => {
    // Secondary metric requires primary metric to be set
    if (data.secondaryMetric && !data.primaryMetric) {
      return false;
    }
    return true;
  },
  { message: "Secondary metric requires primary metric to be set" }
);

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId } = await params;

  // Get relationship with tile metric preferences
  const { data: relationship, error } = await supabase
    .from("investor_company_relationships")
    .select("id, tile_primary_metric, tile_secondary_metric")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (error || !relationship) {
    return jsonError("Company not in portfolio.", 403);
  }

  return NextResponse.json({
    primaryMetric: relationship.tile_primary_metric,
    secondaryMetric: relationship.tile_secondary_metric,
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(parsed.error.issues[0]?.message ?? "Invalid request body.", 400);
  }

  const { id: companyId } = await params;

  // Verify relationship exists
  const { data: relationship, error: relError } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (relError || !relationship) {
    return jsonError("Company not in portfolio.", 403);
  }

  // Update tile metric preferences (lowercase for case-insensitive matching)
  const { error } = await supabase
    .from("investor_company_relationships")
    .update({
      tile_primary_metric: parsed.data.primaryMetric?.toLowerCase() ?? null,
      tile_secondary_metric: parsed.data.secondaryMetric?.toLowerCase() ?? null,
    })
    .eq("id", relationship.id);

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ ok: true });
}

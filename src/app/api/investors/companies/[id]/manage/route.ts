import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const hideSchema = z.object({
  action: z.enum(["hide", "unhide"]),
});

/**
 * PATCH — Toggle hide/unhide a company from the dashboard
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId } = await params;

  const body = await req.json().catch(() => null);
  const parsed = hideSchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request body. Expected { action: 'hide' | 'unhide' }.");
  }

  const isHidden = parsed.data.action === "hide";

  const { error } = await supabase
    .from("investor_company_relationships")
    .update({ is_hidden: isHidden })
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  if (error) {
    return jsonError("Failed to update company visibility.", 500);
  }

  return NextResponse.json({ ok: true });
}

/**
 * DELETE — Remove a company from the investor's portfolio
 * Cleans up: investor_metric_values, portfolio_invitations,
 * investor_company_relationships, and orphan companies.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId } = await params;

  // Verify the relationship exists
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return jsonError("Company not in your portfolio.", 404);
  }

  // Admin client needed for cross-table cleanup that RLS may restrict
  const adminClient = createSupabaseAdminClient();

  // 1. Delete investor_metric_values for this investor+company
  await adminClient
    .from("investor_metric_values")
    .delete()
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  // 2. Delete portfolio_invitations for this investor+company
  await adminClient
    .from("portfolio_invitations")
    .delete()
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  // 3. Delete the investor_company_relationship
  await adminClient
    .from("investor_company_relationships")
    .delete()
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  return NextResponse.json({ ok: true });
}

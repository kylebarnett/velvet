import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; invId: string }> },
) {
  const { id: orgId, invId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return jsonError("Only admins can cancel invitations.", 403);
  }

  const admin = createSupabaseAdminClient();

  // Update status to cancelled
  const { error } = await admin
    .from("organization_invitations")
    .update({ status: "cancelled" })
    .eq("id", invId)
    .eq("organization_id", orgId)
    .eq("status", "pending");

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}

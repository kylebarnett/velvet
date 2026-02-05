import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  role: z.enum(["admin", "member", "viewer"]),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: orgId, userId: targetUserId } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify requester is admin
  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!myMembership || myMembership.role !== "admin") {
    return jsonError("Only admins can update member roles.", 403);
  }

  // Cannot change own role (prevent admin demotion of self)
  if (targetUserId === user.id) {
    return jsonError("Cannot change your own role.", 400);
  }

  // Verify target is a member
  const { data: target } = await supabase
    .from("organization_members")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId)
    .single();

  if (!target) return jsonError("Member not found.", 404);

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("organization_members")
    .update({ role: parsed.data.role })
    .eq("id", target.id);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  const { id: orgId, userId: targetUserId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify requester is admin or is removing self
  const { data: myMembership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!myMembership) return jsonError("Not a member.", 403);

  const isSelf = targetUserId === user.id;
  if (!isSelf && myMembership.role !== "admin") {
    return jsonError("Only admins can remove members.", 403);
  }

  // Cannot remove the org owner
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", orgId)
    .single();

  if (org?.owner_id === targetUserId) {
    return jsonError("Cannot remove the organization owner.", 400);
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", orgId)
    .eq("user_id", targetUserId);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}

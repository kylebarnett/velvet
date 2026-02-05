import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const joinSchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: Request) {
  const parsed = joinSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const admin = createSupabaseAdminClient();

  // Find the invitation by token
  const { data: invitation } = await admin
    .from("organization_invitations")
    .select("id, organization_id, email, role, status, expires_at, invited_by")
    .eq("token", parsed.data.token)
    .single();

  if (!invitation) return jsonError("Invalid invitation.", 404);

  if (invitation.status !== "pending") {
    return jsonError("This invitation has already been used or cancelled.", 400);
  }

  if (new Date(invitation.expires_at) < new Date()) {
    await admin
      .from("organization_invitations")
      .update({ status: "expired" })
      .eq("id", invitation.id);
    return jsonError("This invitation has expired.", 400);
  }

  // Verify email matches
  if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
    return jsonError("This invitation was sent to a different email address.", 403);
  }

  // Check if already a member
  const { data: existing } = await admin
    .from("organization_members")
    .select("id")
    .eq("organization_id", invitation.organization_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    // Already a member, just mark invitation as accepted
    await admin
      .from("organization_invitations")
      .update({ status: "accepted" })
      .eq("id", invitation.id);

    return NextResponse.json({ ok: true, alreadyMember: true });
  }

  // Add as member
  const { error: memberErr } = await admin
    .from("organization_members")
    .insert({
      organization_id: invitation.organization_id,
      user_id: user.id,
      role: invitation.role,
      invited_by: invitation.invited_by,
    });

  if (memberErr) return jsonError(memberErr.message, 400);

  // Mark invitation as accepted
  await admin
    .from("organization_invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  return NextResponse.json({
    ok: true,
    organizationId: invitation.organization_id,
    role: invitation.role,
  });
}

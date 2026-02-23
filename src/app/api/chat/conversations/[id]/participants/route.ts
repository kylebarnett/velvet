import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";
import { addParticipantsSchema } from "@/lib/chat/schemas";

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/[id]/participants — Add participants (group only)
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Verify user is active participant
  const isParticipant = await isActiveParticipant(supabase, id, user.id);
  if (!isParticipant) return jsonError("Forbidden.", 403);

  // Verify conversation is a group
  const { data: conversation } = await supabase
    .from("conversations")
    .select("is_group, organization_id")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) return jsonError("Conversation not found.", 404);
  if (!conversation.is_group) {
    return jsonError("Cannot add participants to a 1:1 conversation.", 400);
  }

  const parsed = addParticipantsSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { userIds } = parsed.data;

  // Verify all new participants belong to the same org
  const { data: orgMembers, error: orgMembersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", conversation.organization_id)
    .in("user_id", userIds);

  if (orgMembersError) {
    return jsonError("Failed to verify participants.", 500);
  }

  const validUserIds = new Set((orgMembers ?? []).map((m) => m.user_id));
  const invalidIds = userIds.filter((uid) => !validUserIds.has(uid));

  if (invalidIds.length > 0) {
    return jsonError(
      "One or more users are not members of this organization.",
      400,
    );
  }

  // Filter out users who are already active participants
  const { data: existingParticipants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id)
    .is("left_at", null)
    .in("user_id", userIds);

  const alreadyIn = new Set(
    (existingParticipants ?? []).map((p) => p.user_id),
  );
  const newUserIds = userIds.filter((uid) => !alreadyIn.has(uid));

  if (newUserIds.length === 0) {
    return NextResponse.json({ ok: true }, { status: 201 });
  }

  const participantRows = newUserIds.map((uid) => ({
    conversation_id: id,
    user_id: uid,
  }));

  const { error: insertError } = await supabase
    .from("conversation_participants")
    .insert(participantRows);

  if (insertError) {
    return jsonError("Failed to add participants.", 500);
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/chat/conversations/[id]/participants — Remove participant
// ---------------------------------------------------------------------------

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Verify current user is active participant
  const isParticipant = await isActiveParticipant(supabase, id, user.id);
  if (!isParticipant) return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const targetUserId = url.searchParams.get("userId");

  if (!targetUserId) {
    return jsonError("userId query parameter is required.", 400);
  }

  // Self-leave: user removing themselves
  if (targetUserId === user.id) {
    const { error: leaveError } = await supabase
      .from("conversation_participants")
      .update({ left_at: new Date().toISOString() })
      .eq("conversation_id", id)
      .eq("user_id", user.id)
      .is("left_at", null);

    if (leaveError) return jsonError("Failed to leave conversation.", 500);
    return NextResponse.json({ ok: true });
  }

  // Removing another user — must be a group conversation
  const { data: conversation } = await supabase
    .from("conversations")
    .select("is_group")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) return jsonError("Conversation not found.", 404);
  if (!conversation.is_group) {
    return jsonError("Cannot remove participants from a 1:1 conversation.", 400);
  }

  // Verify the target user is an active participant
  const targetIsActive = await isActiveParticipant(supabase, id, targetUserId);
  if (!targetIsActive) {
    return jsonError("User is not an active participant.", 400);
  }

  const { error: removeError } = await supabase
    .from("conversation_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", targetUserId)
    .is("left_at", null);

  if (removeError) return jsonError("Failed to remove participant.", 500);

  return NextResponse.json({ ok: true });
}

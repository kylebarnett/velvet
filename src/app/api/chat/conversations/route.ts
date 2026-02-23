import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createConversationSchema } from "@/lib/chat/schemas";
import {
  findExisting1to1,
  getConversationPreview,
} from "@/lib/chat/queries";
import type { ConversationPreview } from "@/lib/chat/types";

// ---------------------------------------------------------------------------
// GET /api/chat/conversations — List user's conversations with previews
// ---------------------------------------------------------------------------

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Resolve user's investor org
  const { data: membership, error: membershipError } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id, org_type)")
    .eq("user_id", user.id)
    .limit(100);

  if (membershipError) return jsonError("Failed to load organization.", 500);

  const investorMembership = (membership ?? []).find((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    return org?.org_type === "investor";
  });

  if (!investorMembership) {
    return jsonError("No investor organization found.", 404);
  }

  // Get conversations the user actively participates in
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", user.id)
    .is("left_at", null);

  if (partError) return jsonError("Failed to load conversations.", 500);

  if (!participations || participations.length === 0) {
    return NextResponse.json({ conversations: [], ok: true });
  }

  const conversationIds = participations.map((p) => p.conversation_id);

  // Build previews for each conversation
  const previews: ConversationPreview[] = [];

  const results = await Promise.all(
    conversationIds.map((id) => getConversationPreview(supabase, id)),
  );

  for (const preview of results) {
    if (preview) previews.push(preview);
  }

  // Sort by updated_at descending (most recent first)
  previews.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return NextResponse.json({ conversations: previews, ok: true });
}

// ---------------------------------------------------------------------------
// POST /api/chat/conversations — Create a new conversation
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const parsed = createConversationSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { participantIds, title, isGroup } = parsed.data;

  // Resolve user's investor org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id, org_type)")
    .eq("user_id", user.id)
    .limit(100);

  const investorMembership = (membership ?? []).find((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    return org?.org_type === "investor";
  });

  if (!investorMembership) {
    return jsonError("No investor organization found.", 404);
  }

  const orgId = investorMembership.organization_id;

  // Verify all participants belong to the same org
  const { data: orgMembers, error: orgMembersError } = await supabase
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", orgId)
    .in("user_id", participantIds);

  if (orgMembersError) {
    return jsonError("Failed to verify participants.", 500);
  }

  const validUserIds = new Set((orgMembers ?? []).map((m) => m.user_id));
  const invalidIds = participantIds.filter((id) => !validUserIds.has(id));

  if (invalidIds.length > 0) {
    return jsonError(
      "One or more participants are not members of your organization.",
      400,
    );
  }

  // For 1:1 conversations (not group, exactly 1 participant), check for existing
  const shouldBeGroup = isGroup || participantIds.length > 1;

  if (!shouldBeGroup && participantIds.length === 1) {
    const existingId = await findExisting1to1(
      supabase,
      user.id,
      participantIds[0],
      orgId,
    );

    if (existingId) {
      return NextResponse.json({ id: existingId, ok: true });
    }
  }

  // Create conversation
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .insert({
      organization_id: orgId,
      title: shouldBeGroup ? (title ?? null) : null,
      is_group: shouldBeGroup,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (convoError || !conversation) {
    return jsonError("Failed to create conversation.", 500);
  }

  // Insert participants: creator + all specified participants
  const allParticipantIds = [user.id, ...participantIds];
  const uniqueParticipantIds = [...new Set(allParticipantIds)];

  const participantRows = uniqueParticipantIds.map((uid) => ({
    conversation_id: conversation.id,
    user_id: uid,
  }));

  const { error: insertError } = await supabase
    .from("conversation_participants")
    .insert(participantRows);

  if (insertError) {
    return jsonError("Failed to add participants.", 500);
  }

  return NextResponse.json({ id: conversation.id, ok: true }, { status: 201 });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";
import type { ParticipantInfo, MessageWithReactions, ReactionSummary } from "@/lib/chat/types";

// ---------------------------------------------------------------------------
// GET /api/chat/conversations/[id] — Get conversation detail
// ---------------------------------------------------------------------------

export async function GET(
  _req: Request,
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

  // Get conversation
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (convoError || !conversation) {
    return jsonError("Conversation not found.", 404);
  }

  // Get active participants
  const { data: participants } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", id)
    .is("left_at", null);

  const participantUserIds = (participants ?? []).map((p) => p.user_id);

  // Fetch user info
  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .in("id", participantUserIds);

  const participantInfos: ParticipantInfo[] = (users ?? []).map((u) => ({
    userId: u.id,
    fullName: u.full_name ?? null,
    email: u.email,
    avatarUrl: u.avatar_url ?? null,
  }));

  // Get recent messages (last 50)
  const { data: rawMessages } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const messages = rawMessages ?? [];

  // Build user lookup for sender info
  const senderIds = [...new Set(messages.map((m) => m.sender_id))];
  const { data: senderUsers } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .in("id", senderIds.length > 0 ? senderIds : ["__none__"]);

  const senderMap = new Map(
    (senderUsers ?? []).map((u) => [
      u.id,
      {
        userId: u.id,
        fullName: u.full_name ?? null,
        email: u.email,
        avatarUrl: u.avatar_url ?? null,
      } as ParticipantInfo,
    ]),
  );

  const fallbackSender: ParticipantInfo = {
    userId: "",
    fullName: null,
    email: "",
    avatarUrl: null,
  };

  // Get reactions for these messages
  const messageIds = messages.map((m) => m.id);
  const { data: reactions } = await supabase
    .from("message_reactions")
    .select("*")
    .in("message_id", messageIds.length > 0 ? messageIds : ["__none__"]);

  // Group reactions by message_id, then aggregate by emoji
  const reactionsByMessage = new Map<string, ReactionSummary[]>();
  for (const r of reactions ?? []) {
    if (!reactionsByMessage.has(r.message_id)) {
      reactionsByMessage.set(r.message_id, []);
    }
    const summaries = reactionsByMessage.get(r.message_id)!;
    const existing = summaries.find((s) => s.emoji === r.emoji);
    if (existing) {
      existing.count += 1;
      existing.userIds.push(r.user_id);
    } else {
      summaries.push({ emoji: r.emoji, count: 1, userIds: [r.user_id] });
    }
  }

  const enrichedMessages: MessageWithReactions[] = messages.map((m) => ({
    ...m,
    reactions: reactionsByMessage.get(m.id) ?? [],
    senderInfo: senderMap.get(m.sender_id) ?? fallbackSender,
  }));

  return NextResponse.json({
    conversation,
    participants: participantInfos,
    messages: enrichedMessages,
    ok: true,
  });
}

// ---------------------------------------------------------------------------
// PATCH /api/chat/conversations/[id] — Update conversation title
// ---------------------------------------------------------------------------

const updateTitleSchema = z.object({
  title: z.string().max(100, "Title cannot exceed 100 characters"),
});

export async function PATCH(
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

  const parsed = updateTitleSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  // Only allow title updates on group conversations
  const { data: conversation } = await supabase
    .from("conversations")
    .select("is_group")
    .eq("id", id)
    .maybeSingle();

  if (!conversation) return jsonError("Conversation not found.", 404);
  if (!conversation.is_group) {
    return jsonError("Cannot set title on a 1:1 conversation.", 400);
  }

  const { data: updated, error: updateError } = await supabase
    .from("conversations")
    .update({ title: parsed.data.title })
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return jsonError("Failed to update conversation.", 500);
  }

  return NextResponse.json({ conversation: updated, ok: true });
}

// ---------------------------------------------------------------------------
// DELETE /api/chat/conversations/[id] — Leave conversation
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: Request,
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

  // Soft-leave: set left_at on the user's participant row
  const { error: leaveError } = await supabase
    .from("conversation_participants")
    .update({ left_at: new Date().toISOString() })
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .is("left_at", null);

  if (leaveError) return jsonError("Failed to leave conversation.", 500);

  return NextResponse.json({ ok: true });
}

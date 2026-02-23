import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";
import { sendMessageSchema } from "@/lib/chat/schemas";
import type {
  MessageWithReactions,
  ParticipantInfo,
  ReactionSummary,
} from "@/lib/chat/types";

// ---------------------------------------------------------------------------
// GET /api/chat/conversations/[id]/messages — Paginated messages (cursor-based)
// ---------------------------------------------------------------------------

export async function GET(
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

  const url = new URL(req.url);
  const before = url.searchParams.get("before"); // message ID cursor
  const rawLimit = parseInt(url.searchParams.get("limit") ?? "", 10);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(rawLimit, 100)
      : 50;

  // Get participant's cleared_at for message filtering
  const { data: participant } = await supabase
    .from("conversation_participants")
    .select("cleared_at")
    .eq("conversation_id", id)
    .eq("user_id", user.id)
    .is("left_at", null)
    .maybeSingle();

  const clearedAt = participant?.cleared_at ?? null;

  // If a cursor is provided, look up that message's created_at
  let cursorTimestamp: string | null = null;
  if (before) {
    const { data: cursorMsg } = await supabase
      .from("messages")
      .select("created_at")
      .eq("id", before)
      .eq("conversation_id", id)
      .maybeSingle();

    if (!cursorMsg) return jsonError("Invalid cursor.", 400);
    cursorTimestamp = cursorMsg.created_at;
  }

  // Build query
  let query = supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", id)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(limit + 1); // fetch one extra to determine hasMore

  if (cursorTimestamp) {
    query = query.lt("created_at", cursorTimestamp);
  }

  if (clearedAt) {
    query = query.gt("created_at", clearedAt);
  }

  const { data: rawMessages, error: msgError } = await query;

  if (msgError) return jsonError("Failed to load messages.", 500);

  const allMessages = rawMessages ?? [];
  const hasMore = allMessages.length > limit;
  const messages = hasMore ? allMessages.slice(0, limit) : allMessages;

  // Build sender info lookup
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

  // Aggregate reactions by message and emoji
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
    messages: enrichedMessages,
    hasMore,
    ok: true,
  });
}

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/[id]/messages — Send a message
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

  const parsed = sendMessageSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { content, messageType, fileUrl, fileName, fileSize } = parsed.data;

  const { data: message, error: insertError } = await supabase
    .from("messages")
    .insert({
      conversation_id: id,
      sender_id: user.id,
      content,
      message_type: messageType,
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
      file_size: fileSize ?? null,
    })
    .select("id")
    .single();

  if (insertError || !message) {
    return jsonError("Failed to send message.", 500);
  }

  // Touch conversation updated_at so it sorts to top in list
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", id);

  return NextResponse.json({ id: message.id, ok: true }, { status: 201 });
}

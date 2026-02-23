import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversationPreview, Message, ParticipantInfo } from "@/lib/chat/types";

// ---------------------------------------------------------------------------
// Shared query helpers for the chat system
// ---------------------------------------------------------------------------

/**
 * Find an existing 1:1 conversation between two users in an organisation.
 *
 * Returns the conversation id if one exists, otherwise `null`.
 */
export async function findExisting1to1(
  supabase: SupabaseClient,
  userId: string,
  otherUserId: string,
  orgId: string,
): Promise<string | null> {
  // Find conversations that are 1:1, belong to the org, and where both users
  // are active participants (left_at IS NULL).
  // Strategy: get conversation IDs where the current user is active, then
  // filter to those that also contain the other user and are non-group.

  const { data: myConversations, error: myError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (myError || !myConversations?.length) return null;

  const myConvoIds = myConversations.map((r) => r.conversation_id);

  // Among those, find ones where the other user is also an active participant
  const { data: shared, error: sharedError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", otherUserId)
    .is("left_at", null)
    .in("conversation_id", myConvoIds);

  if (sharedError || !shared?.length) return null;

  const sharedIds = shared.map((r) => r.conversation_id);

  // Finally, ensure the conversation is a 1:1 (is_group = false) and belongs to the org
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("id")
    .in("id", sharedIds)
    .eq("organization_id", orgId)
    .eq("is_group", false)
    .limit(1)
    .maybeSingle();

  if (convoError || !conversation) return null;

  return conversation.id;
}

/**
 * Total unread message count across all conversations for a user.
 *
 * For each conversation the user actively participates in, counts messages
 * created after the user's last read receipt (or all messages if no receipt
 * exists), excluding messages sent by the user themselves.
 */
export async function getUnreadCountForUser(
  supabase: SupabaseClient,
  userId: string,
): Promise<number> {
  // 1. Get all conversation IDs where the user is an active participant
  const { data: participations, error: partError } = await supabase
    .from("conversation_participants")
    .select("conversation_id")
    .eq("user_id", userId)
    .is("left_at", null);

  if (partError || !participations?.length) return 0;

  const conversationIds = participations.map((p) => p.conversation_id);

  // 2. Get the user's read receipts for those conversations
  const { data: receipts, error: receiptError } = await supabase
    .from("read_receipts")
    .select("conversation_id, last_read_message_id, last_read_at")
    .eq("user_id", userId)
    .in("conversation_id", conversationIds);

  if (receiptError) return 0;

  const receiptMap = new Map(
    (receipts ?? []).map((r) => [r.conversation_id, r]),
  );

  // 3. For each conversation, count messages after the read receipt timestamp
  let total = 0;

  // Batch the count queries for efficiency — Promise.all is fine here since
  // each call is independent.
  const counts = await Promise.all(
    conversationIds.map(async (convoId) => {
      const receipt = receiptMap.get(convoId);

      let query = supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("conversation_id", convoId)
        .neq("sender_id", userId)
        .is("deleted_at", null);

      if (receipt?.last_read_at) {
        query = query.gt("created_at", receipt.last_read_at);
      }

      const { count, error } = await query;
      if (error) return 0;
      return count ?? 0;
    }),
  );

  for (const c of counts) {
    total += c;
  }

  return total;
}

/**
 * Build a {@link ConversationPreview} for a single conversation.
 *
 * Includes participant info, the last message, and the unread count for the
 * currently authenticated user (inferred from the Supabase client's session).
 */
export async function getConversationPreview(
  supabase: SupabaseClient,
  conversationId: string,
): Promise<ConversationPreview | null> {
  // Get conversation row
  const { data: conversation, error: convoError } = await supabase
    .from("conversations")
    .select("*")
    .eq("id", conversationId)
    .maybeSingle();

  if (convoError || !conversation) return null;

  // Get active participants
  const { data: participants, error: partError } = await supabase
    .from("conversation_participants")
    .select("user_id")
    .eq("conversation_id", conversationId)
    .is("left_at", null);

  if (partError) return null;

  const participantUserIds = (participants ?? []).map((p) => p.user_id);

  // Look up participant info from the users table
  const { data: users, error: usersError } = await supabase
    .from("users")
    .select("id, full_name, email, avatar_url")
    .in("id", participantUserIds);

  if (usersError) return null;

  const participantInfos: ParticipantInfo[] = (users ?? []).map((u) => ({
    userId: u.id,
    fullName: u.full_name ?? null,
    email: u.email,
    avatarUrl: u.avatar_url ?? null,
  }));

  // Get the last message
  const { data: lastMessage, error: msgError } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (msgError) return null;

  // Get unread count for the current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let unreadCount = 0;

  if (user) {
    const { data: receipt } = await supabase
      .from("read_receipts")
      .select("last_read_at")
      .eq("conversation_id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle();

    let countQuery = supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("conversation_id", conversationId)
      .neq("sender_id", user.id)
      .is("deleted_at", null);

    if (receipt?.last_read_at) {
      countQuery = countQuery.gt("created_at", receipt.last_read_at);
    }

    const { count } = await countQuery;
    unreadCount = count ?? 0;
  }

  return {
    ...conversation,
    participants: participantInfos,
    lastMessage: (lastMessage as Message) ?? null,
    unreadCount,
  };
}

/**
 * Check whether a user is an active (non-departed) participant of a
 * conversation.
 */
export async function isActiveParticipant(
  supabase: SupabaseClient,
  conversationId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("conversation_participants")
    .select("id")
    .eq("conversation_id", conversationId)
    .eq("user_id", userId)
    .is("left_at", null)
    .maybeSingle();

  if (error) return false;
  return data !== null;
}

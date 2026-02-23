// ---------------------------------------------------------------------------
// Chat system types — mirrors Supabase DB tables and derived UI types
// ---------------------------------------------------------------------------

/** Message content type discriminator */
export type MessageType = "text" | "file" | "system";

// ---------------------------------------------------------------------------
// DB row types
// ---------------------------------------------------------------------------

/** Row in `conversations` */
export interface Conversation {
  id: string;
  organization_id: string;
  title: string | null;
  is_group: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

/** Row in `conversation_participants` */
export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  cleared_at: string | null;
}

/** Row in `messages` */
export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: MessageType;
  file_url: string | null;
  file_name: string | null;
  file_size: number | null;
  created_at: string;
  edited_at: string | null;
  deleted_at: string | null;
}

/** Row in `message_reactions` */
export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

/** Row in `read_receipts` */
export interface ReadReceipt {
  id: string;
  conversation_id: string;
  user_id: string;
  last_read_message_id: string;
  last_read_at: string;
}

/** Row in `user_favorites` */
export interface UserFavorite {
  id: string;
  user_id: string;
  favorite_user_id: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Derived / UI types
// ---------------------------------------------------------------------------

/** Lightweight user info surfaced in conversation participant lists */
export interface ParticipantInfo {
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
}

/** Aggregated reaction for a single emoji on a message */
export interface ReactionSummary {
  emoji: string;
  count: number;
  userIds: string[];
}

/** A message enriched with reaction summaries and sender info */
export interface MessageWithReactions extends Message {
  reactions: ReactionSummary[];
  senderInfo: ParticipantInfo;
}

/** Conversation enriched with data needed for the conversation list UI */
export interface ConversationPreview extends Conversation {
  participants: ParticipantInfo[];
  lastMessage: Message | null;
  unreadCount: number;
}

import { z } from "zod";

// ---------------------------------------------------------------------------
// Chat system Zod validation schemas
// ---------------------------------------------------------------------------

/** Create a new conversation (1:1 or group) */
export const createConversationSchema = z.object({
  participantIds: z
    .array(z.string().uuid())
    .min(1, "At least one participant is required")
    .max(50, "Cannot exceed 50 participants"),
  title: z.string().max(100, "Title cannot exceed 100 characters").optional(),
  isGroup: z.boolean().optional(),
});
export type CreateConversationInput = z.infer<typeof createConversationSchema>;

/** Send a message in a conversation */
export const sendMessageSchema = z.object({
  content: z
    .string()
    .min(1, "Message cannot be empty")
    .max(4000, "Message cannot exceed 4000 characters"),
  messageType: z.enum(["text", "file", "system"]).default("text"),
  fileUrl: z.string().url("Invalid file URL").optional(),
  fileName: z
    .string()
    .max(255, "File name cannot exceed 255 characters")
    .optional(),
  fileSize: z
    .number()
    .int("File size must be an integer")
    .positive("File size must be positive")
    .max(10_485_760, "File size cannot exceed 10 MB")
    .optional(),
});
export type SendMessageInput = z.infer<typeof sendMessageSchema>;

/** Mark messages as read up to a specific message */
export const markReadSchema = z.object({
  lastReadMessageId: z.string().uuid("Invalid message ID"),
});
export type MarkReadInput = z.infer<typeof markReadSchema>;

/** Add participants to a group conversation */
export const addParticipantsSchema = z.object({
  userIds: z
    .array(z.string().uuid())
    .min(1, "At least one user is required")
    .max(50, "Cannot add more than 50 participants at once"),
});
export type AddParticipantsInput = z.infer<typeof addParticipantsSchema>;

/** Add a reaction to a message */
export const addReactionSchema = z.object({
  emoji: z
    .string()
    .min(1, "Emoji is required")
    .max(8, "Emoji cannot exceed 8 characters"),
});
export type AddReactionInput = z.infer<typeof addReactionSchema>;

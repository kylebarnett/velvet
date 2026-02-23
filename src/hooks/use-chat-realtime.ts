"use client";

import * as React from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { MessageWithReactions } from "@/lib/chat/types";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UseChatRealtimeOptions = {
  conversationId: string | null;
  onNewMessage: (message: MessageWithReactions) => void;
  onMessageUpdate: (message: MessageWithReactions) => void;
  onReactionChange: () => void;
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Subscribes to Supabase Realtime Postgres Changes for messages and reactions
 * in a given conversation. Cleans up channels on unmount or when the
 * conversationId changes.
 */
export function useChatRealtime({
  conversationId,
  onNewMessage,
  onMessageUpdate,
  onReactionChange,
}: UseChatRealtimeOptions): void {
  const supabaseRef = React.useRef(createSupabaseBrowserClient());

  // Keep callback refs stable so we don't re-subscribe on every render
  const onNewMessageRef = React.useRef(onNewMessage);
  const onMessageUpdateRef = React.useRef(onMessageUpdate);
  const onReactionChangeRef = React.useRef(onReactionChange);

  React.useEffect(() => {
    onNewMessageRef.current = onNewMessage;
  }, [onNewMessage]);

  React.useEffect(() => {
    onMessageUpdateRef.current = onMessageUpdate;
  }, [onMessageUpdate]);

  React.useEffect(() => {
    onReactionChangeRef.current = onReactionChange;
  }, [onReactionChange]);

  React.useEffect(() => {
    if (!conversationId) return;

    const supabase = supabaseRef.current;
    const channels: RealtimeChannel[] = [];

    // Fetch the latest message with full sender info + reactions
    async function fetchLatestMessage(
      convId: string,
    ): Promise<MessageWithReactions | null> {
      try {
        const res = await fetch(
          `/api/chat/conversations/${convId}/messages?limit=1`,
        );
        if (!res.ok) return null;
        const data = await res.json();
        const messages: MessageWithReactions[] = data.messages ?? [];
        return messages[0] ?? null;
      } catch (err) {
        logger.error("Failed to fetch latest message:", err);
        return null;
      }
    }

    // --- Messages channel ---
    const messagesChannel = supabase
      .channel(`chat:messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const msg = await fetchLatestMessage(conversationId);
          if (msg) {
            onNewMessageRef.current(msg);
          }
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        async () => {
          const msg = await fetchLatestMessage(conversationId);
          if (msg) {
            onMessageUpdateRef.current(msg);
          }
        },
      )
      .subscribe();

    channels.push(messagesChannel);

    // --- Reactions channel ---
    const reactionsChannel = supabase
      .channel(`chat:reactions:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "message_reactions",
        },
        () => {
          // Fire callback for any reaction change — the consumer will refetch
          onReactionChangeRef.current();
        },
      )
      .subscribe();

    channels.push(reactionsChannel);

    return () => {
      for (const channel of channels) {
        supabase.removeChannel(channel);
      }
    };
  }, [conversationId]);

  return undefined;
}

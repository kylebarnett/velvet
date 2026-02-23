"use client";

import * as React from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TypingUser = {
  userId: string;
  fullName: string;
};

type UseTypingIndicatorOptions = {
  conversationId: string | null;
  userId: string;
  fullName: string;
};

type UseTypingIndicatorReturn = {
  typingUsers: TypingUser[];
  sendTyping: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TYPING_DEBOUNCE_MS = 2_000;
const TYPING_TIMEOUT_MS = 3_000;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages typing indicators for a conversation using Supabase Broadcast.
 *
 * - `sendTyping()` broadcasts a typing event (debounced to at most once per 2s).
 * - Listens for typing events from other participants and auto-removes them
 *   after 3s of inactivity.
 */
export function useTypingIndicator({
  conversationId,
  userId,
  fullName,
}: UseTypingIndicatorOptions): UseTypingIndicatorReturn {
  const supabaseRef = React.useRef(createSupabaseBrowserClient());
  const channelRef = React.useRef<RealtimeChannel | null>(null);
  const lastSentRef = React.useRef<number>(0);
  const timersRef = React.useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const [typingUsers, setTypingUsers] = React.useState<TypingUser[]>([]);

  // Subscribe to typing broadcast channel
  React.useEffect(() => {
    if (!conversationId) {
      setTypingUsers([]);
      return;
    }

    const supabase = supabaseRef.current;
    const channelName = `chat:typing:${conversationId}`;

    const channel = supabase.channel(channelName).on(
      "broadcast",
      { event: "typing" },
      (payload) => {
        const data = payload.payload as {
          userId: string;
          fullName: string;
          isTyping: boolean;
        };

        // Ignore own typing events
        if (data.userId === userId) return;

        if (!data.isTyping) {
          // Remove user from typing list
          clearTimerForUser(data.userId);
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
          return;
        }

        // Add or refresh user in typing list
        setTypingUsers((prev) => {
          const exists = prev.some((u) => u.userId === data.userId);
          if (exists) return prev;
          return [...prev, { userId: data.userId, fullName: data.fullName }];
        });

        // Reset auto-remove timer
        clearTimerForUser(data.userId);
        const timer = setTimeout(() => {
          setTypingUsers((prev) =>
            prev.filter((u) => u.userId !== data.userId),
          );
          timersRef.current.delete(data.userId);
        }, TYPING_TIMEOUT_MS);
        timersRef.current.set(data.userId, timer);
      },
    ).subscribe();

    channelRef.current = channel;

    return () => {
      // Clear all timers
      for (const timer of timersRef.current.values()) {
        clearTimeout(timer);
      }
      timersRef.current.clear();
      setTypingUsers([]);

      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, userId]);

  function clearTimerForUser(uid: string) {
    const existing = timersRef.current.get(uid);
    if (existing) {
      clearTimeout(existing);
      timersRef.current.delete(uid);
    }
  }

  // Debounced send — at most once per TYPING_DEBOUNCE_MS
  const sendTyping = React.useCallback(() => {
    const now = Date.now();
    if (now - lastSentRef.current < TYPING_DEBOUNCE_MS) return;
    lastSentRef.current = now;

    const channel = channelRef.current;
    if (!channel) return;

    channel.send({
      type: "broadcast",
      event: "typing",
      payload: { userId, fullName, isTyping: true },
    });
  }, [userId, fullName]);

  return { typingUsers, sendTyping };
}

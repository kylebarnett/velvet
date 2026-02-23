"use client";

import * as React from "react";

import type { ConversationPreview, MessageWithReactions } from "@/lib/chat/types";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatState = {
  conversations: ConversationPreview[];
  activeConversationId: string | null;
  isPanelOpen: boolean;
  showNewConvoModal: boolean;
  totalUnread: number;
  isLoading: boolean;
};

type ChatContextValue = ChatState & {
  openConversation: (id: string) => void;
  showConversationList: () => void;
  startDirectMessage: (userId: string) => void;
  openNewConversation: () => void;
  closePanel: () => void;
  togglePanel: () => void;
  refreshConversations: () => Promise<void>;
  markAsRead: (conversationId: string, messageId: string) => Promise<void>;
  closeNewConvoModal: () => void;
};

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const ChatContext = React.createContext<ChatContextValue | null>(null);

/**
 * Access the chat context. Throws if used outside `<ChatProvider>`.
 */
export function useChatContext(): ChatContextValue {
  const ctx = React.useContext(ChatContext);
  if (!ctx) {
    throw new Error("useChatContext must be used within ChatProvider");
  }
  return ctx;
}

/**
 * Safe version that returns `null` when rendered outside the provider.
 * Useful for nav items that may render before the provider mounts.
 */
export function useChatContextSafe(): ChatContextValue | null {
  return React.useContext(ChatContext);
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

const UNREAD_POLL_INTERVAL = 60_000; // 60 seconds

type ChatProviderProps = {
  orgId: string;
  children: React.ReactNode;
};

export function ChatProvider({ orgId, children }: ChatProviderProps) {
  const [state, setState] = React.useState<ChatState>({
    conversations: [],
    activeConversationId: null,
    isPanelOpen: false,
    showNewConvoModal: false,
    totalUnread: 0,
    isLoading: true,
  });

  // ------- Data fetching -------

  const fetchConversations = React.useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      if (!res.ok) return;
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        conversations: data.conversations ?? [],
      }));
    } catch (err) {
      logger.error("Failed to fetch conversations:", err);
    }
  }, []);

  const fetchUnreadCount = React.useCallback(async () => {
    try {
      const res = await fetch("/api/chat/unread-count");
      if (!res.ok) return;
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        totalUnread: data.totalUnread ?? 0,
      }));
    } catch (err) {
      logger.error("Failed to fetch unread count:", err);
    }
  }, []);

  const refreshConversations = React.useCallback(async () => {
    await Promise.all([fetchConversations(), fetchUnreadCount()]);
  }, [fetchConversations, fetchUnreadCount]);

  // Initial load
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      await Promise.all([fetchConversations(), fetchUnreadCount()]);
      if (!cancelled) {
        setState((prev) => ({ ...prev, isLoading: false }));
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [fetchConversations, fetchUnreadCount]);

  // Poll unread count every 60s
  React.useEffect(() => {
    const interval = setInterval(fetchUnreadCount, UNREAD_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // ------- Actions -------

  const openConversation = React.useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activeConversationId: id,
      isPanelOpen: true,
      showNewConvoModal: false,
    }));
  }, []);

  const showConversationList = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      activeConversationId: null,
      isPanelOpen: true,
    }));
  }, []);

  const startDirectMessage = React.useCallback(
    async (userId: string) => {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ participantIds: [userId] }),
        });
        if (!res.ok) {
          logger.error("Failed to start direct message:", res.status);
          return;
        }
        const data = await res.json();
        const conversationId = data.id;

        // Refresh to pick up the new/existing conversation
        await fetchConversations();

        setState((prev) => ({
          ...prev,
          activeConversationId: conversationId,
          isPanelOpen: true,
          showNewConvoModal: false,
        }));
      } catch (err) {
        logger.error("Failed to start direct message:", err);
      }
    },
    [fetchConversations],
  );

  const openNewConversation = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      showNewConvoModal: true,
    }));
  }, []);

  const closeNewConvoModal = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      showNewConvoModal: false,
    }));
  }, []);

  const closePanel = React.useCallback(() => {
    setState((prev) => ({
      ...prev,
      isPanelOpen: false,
      activeConversationId: null,
    }));
  }, []);

  const togglePanel = React.useCallback(() => {
    setState((prev) => {
      if (prev.isPanelOpen) {
        return { ...prev, isPanelOpen: false, activeConversationId: null };
      }
      // Opening — if no active conversation, just show the list
      return { ...prev, isPanelOpen: true };
    });
  }, []);

  const markAsRead = React.useCallback(
    async (conversationId: string, messageId: string) => {
      try {
        const res = await fetch(
          `/api/chat/conversations/${conversationId}/read`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ lastReadMessageId: messageId }),
          },
        );
        if (!res.ok) {
          logger.error("Failed to mark as read:", res.status);
          return;
        }
        await refreshConversations();
      } catch (err) {
        logger.error("Failed to mark as read:", err);
      }
    },
    [refreshConversations],
  );

  // ------- Context value -------

  const value: ChatContextValue = React.useMemo(
    () => ({
      ...state,
      openConversation,
      showConversationList,
      startDirectMessage,
      openNewConversation,
      closePanel,
      togglePanel,
      refreshConversations,
      markAsRead,
      closeNewConvoModal,
    }),
    [
      state,
      openConversation,
      showConversationList,
      startDirectMessage,
      openNewConversation,
      closePanel,
      togglePanel,
      refreshConversations,
      markAsRead,
      closeNewConvoModal,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

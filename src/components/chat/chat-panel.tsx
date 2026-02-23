"use client";

import * as React from "react";
import { ArrowDown, ArrowLeft, Ellipsis, X } from "lucide-react";

import { useChatContext } from "@/contexts/chat-context";
import { useChatRealtime } from "@/hooks/use-chat-realtime";
import { useTypingIndicator } from "@/hooks/use-typing-indicator";
import { ChatMessage } from "@/components/chat/chat-message";
import { MessageInput } from "@/components/chat/message-input";
import { TypingIndicator } from "@/components/chat/typing-indicator";
import type {
  Conversation,
  MessageWithReactions,
  ParticipantInfo,
} from "@/lib/chat/types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatPanelProps = {
  conversationId: string;
  currentUserId: string;
  onBack: () => void;
  onClose: () => void;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDisplayName(
  conversation: Conversation | null,
  participants: ParticipantInfo[],
  currentUserId: string,
): string {
  if (conversation?.is_group && conversation.title) return conversation.title;

  const others = participants.filter((p) => p.userId !== currentUserId);
  if (others.length === 0) return "Conversation";
  return others.map((p) => p.fullName ?? p.email).join(", ");
}

function getOtherParticipant(
  participants: ParticipantInfo[],
  currentUserId: string,
): ParticipantInfo | null {
  return participants.find((p) => p.userId !== currentUserId) ?? null;
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatPanel({
  conversationId,
  currentUserId,
  onBack,
  onClose,
}: ChatPanelProps) {
  const chat = useChatContext();

  // Presence — may not be available
  let isUserOnline: (userId: string) => boolean = () => false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @typescript-eslint/no-require-imports
    const { usePresenceContext } = require("@/contexts/presence-context");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const presence = usePresenceContext();
    isUserOnline = presence.isUserOnline;
  } catch {
    // Presence not available
  }

  // State
  const [conversation, setConversation] = React.useState<Conversation | null>(
    null,
  );
  const [participants, setParticipants] = React.useState<ParticipantInfo[]>([]);
  const [messages, setMessages] = React.useState<MessageWithReactions[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasMore, setHasMore] = React.useState(false);
  const [loadingMore, setLoadingMore] = React.useState(false);
  const [showNewMsgButton, setShowNewMsgButton] = React.useState(false);
  const [newMsgCount, setNewMsgCount] = React.useState(0);
  const [showOverflowMenu, setShowOverflowMenu] = React.useState(false);

  const messagesContainerRef = React.useRef<HTMLDivElement>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const isAtBottomRef = React.useRef(true);
  const overflowMenuRef = React.useRef<HTMLDivElement>(null);

  // Current user's full name for typing indicator
  const currentUserName = React.useMemo(() => {
    const me = participants.find((p) => p.userId === currentUserId);
    return me?.fullName ?? "You";
  }, [participants, currentUserId]);

  // Typing indicator
  const { typingUsers, sendTyping } = useTypingIndicator({
    conversationId,
    userId: currentUserId,
    fullName: currentUserName,
  });

  // ------- Initial data load -------

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const res = await fetch(`/api/chat/conversations/${conversationId}`);
        if (!res.ok) {
          logger.error("Failed to load conversation:", res.status);
          return;
        }
        const data = await res.json();
        if (cancelled) return;

        setConversation(data.conversation ?? null);
        setParticipants(data.participants ?? []);
        // Messages come in desc order from the API; reverse for chronological display
        const msgs: MessageWithReactions[] = data.messages ?? [];
        setMessages(msgs.reverse());
        // The API returns max 50, so if we got 50 there may be more
        setHasMore(msgs.length >= 50);
      } catch (err) {
        logger.error("Failed to load conversation:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [conversationId]);

  // ------- Auto-scroll to bottom on initial load -------

  React.useEffect(() => {
    if (!loading && messages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
    }
    // Only on initial load completion
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // ------- Scroll tracking -------

  function handleScroll() {
    const container = messagesContainerRef.current;
    if (!container) return;

    // Check if scrolled near bottom (within 80px)
    const { scrollTop, scrollHeight, clientHeight } = container;
    const atBottom = scrollHeight - scrollTop - clientHeight < 80;
    isAtBottomRef.current = atBottom;

    if (atBottom) {
      setShowNewMsgButton(false);
      setNewMsgCount(0);
    }

    // Infinite scroll up: load older messages
    if (scrollTop < 100 && hasMore && !loadingMore) {
      loadOlderMessages();
    }
  }

  // ------- Load older messages -------

  async function loadOlderMessages() {
    if (!hasMore || loadingMore || messages.length === 0) return;

    setLoadingMore(true);
    const oldestMessage = messages[0];

    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages?before=${oldestMessage.id}`,
      );
      if (!res.ok) return;

      const data = await res.json();
      const olderMsgs: MessageWithReactions[] = data.messages ?? [];
      setHasMore(data.hasMore ?? false);

      if (olderMsgs.length > 0) {
        // Preserve scroll position
        const container = messagesContainerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;

        // Older messages come in desc order; reverse for chronological
        setMessages((prev) => [...olderMsgs.reverse(), ...prev]);

        // Restore scroll position after new messages are rendered
        requestAnimationFrame(() => {
          if (container) {
            const newScrollHeight = container.scrollHeight;
            container.scrollTop = newScrollHeight - prevScrollHeight;
          }
        });
      }
    } catch (err) {
      logger.error("Failed to load older messages:", err);
    } finally {
      setLoadingMore(false);
    }
  }

  // ------- Realtime -------

  const handleNewMessage = React.useCallback(
    (msg: MessageWithReactions) => {
      setMessages((prev) => {
        // Deduplicate
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });

      // If user is at the bottom, auto-scroll and mark as read
      if (isAtBottomRef.current) {
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: "smooth" });
        });
        // Mark as read
        chat.markAsRead(conversationId, msg.id);
      } else {
        // Show "new messages" button
        setShowNewMsgButton(true);
        setNewMsgCount((prev) => prev + 1);
      }
    },
    [conversationId, chat],
  );

  const handleMessageUpdate = React.useCallback(
    (updatedMsg: MessageWithReactions) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === updatedMsg.id ? updatedMsg : m)),
      );
    },
    [],
  );

  const handleReactionChange = React.useCallback(async () => {
    // Refetch current messages to get updated reactions
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages?limit=50`,
      );
      if (!res.ok) return;
      const data = await res.json();
      const freshMsgs: MessageWithReactions[] = (data.messages ?? []).reverse();

      setMessages((prev) => {
        // Merge: update existing messages with fresh reaction data
        const freshMap = new Map(freshMsgs.map((m) => [m.id, m]));
        return prev.map((m) => freshMap.get(m.id) ?? m);
      });
    } catch (err) {
      logger.error("Failed to refresh reactions:", err);
    }
  }, [conversationId]);

  useChatRealtime({
    conversationId,
    onNewMessage: handleNewMessage,
    onMessageUpdate: handleMessageUpdate,
    onReactionChange: handleReactionChange,
  });

  // ------- Mark as read on mount / when at bottom -------

  React.useEffect(() => {
    if (!loading && messages.length > 0) {
      const lastMsg = messages[messages.length - 1];
      chat.markAsRead(conversationId, lastMsg.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, conversationId]);

  // ------- Send message -------

  async function handleSend(
    content: string,
    file?: { url: string; name: string; size: number },
  ) {
    try {
      const body: Record<string, unknown> = {
        content: file && !content ? "" : content,
        messageType: file ? "file" : "text",
      };
      if (file) {
        body.fileUrl = file.url;
        body.fileName = file.name;
        body.fileSize = file.size;
      }

      const res = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      );

      if (!res.ok) {
        logger.error("Failed to send message:", res.status);
      }

      // The realtime subscription will pick up the new message
    } catch (err) {
      logger.error("Failed to send message:", err);
    }
  }

  // ------- Reactions -------

  async function handleReact(messageId: string, emoji: string) {
    try {
      await fetch(
        `/api/chat/conversations/${conversationId}/messages/${messageId}/reactions`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emoji }),
        },
      );
    } catch (err) {
      logger.error("Failed to add reaction:", err);
    }
  }

  async function handleRemoveReaction(messageId: string, emoji: string) {
    try {
      await fetch(
        `/api/chat/conversations/${conversationId}/messages/${messageId}/reactions?emoji=${encodeURIComponent(emoji)}`,
        { method: "DELETE" },
      );
    } catch (err) {
      logger.error("Failed to remove reaction:", err);
    }
  }

  // ------- Overflow menu actions -------

  async function handleClearConversation() {
    setShowOverflowMenu(false);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}/read`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lastReadMessageId:
              messages.length > 0
                ? messages[messages.length - 1].id
                : undefined,
          }),
        },
      );
      if (!res.ok) {
        logger.error("Failed to clear conversation:", res.status);
      }
    } catch (err) {
      logger.error("Failed to clear conversation:", err);
    }
  }

  async function handleLeaveConversation() {
    setShowOverflowMenu(false);
    try {
      const res = await fetch(
        `/api/chat/conversations/${conversationId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        logger.error("Failed to leave conversation:", res.status);
        return;
      }
      await chat.refreshConversations();
      onBack();
    } catch (err) {
      logger.error("Failed to leave conversation:", err);
    }
  }

  // Close overflow menu on outside click
  React.useEffect(() => {
    if (!showOverflowMenu) return;

    function handleClick(e: MouseEvent) {
      if (
        overflowMenuRef.current &&
        !overflowMenuRef.current.contains(e.target as Node)
      ) {
        setShowOverflowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOverflowMenu]);

  // ------- Scroll to bottom -------

  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    setShowNewMsgButton(false);
    setNewMsgCount(0);
  }

  // ------- Derived state -------

  const displayName = getDisplayName(conversation, participants, currentUserId);
  const isGroup = conversation?.is_group ?? false;
  const otherUser = !isGroup
    ? getOtherParticipant(participants, currentUserId)
    : null;
  const otherOnline = otherUser ? isUserOnline(otherUser.userId) : false;

  // ------- Render -------

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-border-default px-2 py-2">
        <button
          type="button"
          onClick={onBack}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Back to conversation list"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        {/* Conversation info */}
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          {/* Avatar for 1:1 */}
          {otherUser && (
            <div className="relative shrink-0">
              {otherUser.avatarUrl ? (
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.fullName ?? "User"}
                  className="h-9 w-9 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-text-secondary">
                  {getInitials(otherUser.fullName)}
                </div>
              )}
              <span
                className={cn(
                  "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-primary",
                  otherOnline ? "bg-emerald-400" : "bg-text-muted/40",
                )}
                aria-label={otherOnline ? "Online" : "Offline"}
              />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold text-text-primary">
              {displayName}
            </h2>
            {otherUser && (
              <p className="text-xs text-text-muted">
                {otherOnline ? "Online" : "Offline"}
              </p>
            )}
            {isGroup && (
              <p className="text-xs text-text-muted">
                {participants.length} members
              </p>
            )}
          </div>
        </div>

        {/* Overflow menu */}
        <div className="relative" ref={overflowMenuRef}>
          <button
            type="button"
            onClick={() => setShowOverflowMenu((prev) => !prev)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Conversation options"
          >
            <Ellipsis className="h-5 w-5" />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm">
              <button
                type="button"
                onClick={handleClearConversation}
                className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              >
                Clear conversation
              </button>
              {isGroup && (
                <button
                  type="button"
                  onClick={handleLeaveConversation}
                  className="flex w-full items-center gap-2 whitespace-nowrap px-3 py-2 text-sm text-red-300 transition-colors hover:bg-bg-elevated"
                >
                  Leave conversation
                </button>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
          aria-label="Close chat"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Messages area */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="relative flex-1 overflow-y-auto"
      >
        {loading ? (
          <div className="flex flex-col gap-3 px-4 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2",
                  i % 2 === 0 ? "flex-row" : "flex-row-reverse",
                )}
              >
                <div className="h-8 w-8 shrink-0 animate-pulse rounded-full bg-white/5" />
                <div
                  className={cn(
                    "space-y-1",
                    i % 2 === 0 ? "items-start" : "items-end",
                  )}
                >
                  <div className="h-10 w-40 animate-pulse rounded-2xl bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-sm text-text-muted">
              No messages yet. Send the first one!
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-0.5 py-4">
            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex justify-center py-3">
                <span className="text-xs text-text-muted">
                  Loading older messages...
                </span>
              </div>
            )}

            {hasMore && !loadingMore && (
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  onClick={loadOlderMessages}
                  className="text-xs text-text-muted transition-colors hover:text-text-secondary"
                >
                  Load more
                </button>
              </div>
            )}

            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                isOwn={msg.sender_id === currentUserId}
                isGroup={isGroup}
                currentUserId={currentUserId}
                onReact={handleReact}
                onRemoveReaction={handleRemoveReaction}
              />
            ))}

            {/* Typing indicator */}
            <TypingIndicator typingUsers={typingUsers} />

            {/* Scroll anchor */}
            <div ref={bottomRef} />
          </div>
        )}

        {/* New messages button */}
        {showNewMsgButton && (
          <button
            type="button"
            onClick={scrollToBottom}
            className="absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border-default bg-bg-secondary px-4 py-2 text-xs font-medium text-text-primary shadow-xl transition-colors hover:bg-bg-elevated"
            aria-label="Scroll to new messages"
          >
            <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            {newMsgCount} new message{newMsgCount === 1 ? "" : "s"}
          </button>
        )}
      </div>

      {/* Message input */}
      <MessageInput
        onSend={handleSend}
        onTyping={sendTyping}
        conversationId={conversationId}
      />
    </div>
  );
}

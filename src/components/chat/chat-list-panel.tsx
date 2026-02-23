"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { MessageSquarePlus, Search, Star, X } from "lucide-react";

import { useChatContext } from "@/contexts/chat-context";
import type { ConversationPreview, ParticipantInfo } from "@/lib/chat/types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatListPanelProps = {
  onSelectConversation: (id: string) => void;
  onClose: () => void;
  onNewConversation: () => void;
};

type FavoriteUser = {
  id: string;
  userId: string;
  fullName: string | null;
  email: string;
  avatarUrl: string | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a timestamp into a relative "time ago" string. */
function timeAgo(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffSec = Math.max(0, Math.floor((now - then) / 1000));

  if (diffSec < 60) return "now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 30) return `${diffDays}d`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}

/** Truncate text with ellipsis. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen).trimEnd() + "...";
}

/** Get the display name for a conversation. */
function getConversationDisplayName(
  convo: ConversationPreview,
  currentUserId: string,
): string {
  if (convo.is_group && convo.title) return convo.title;

  const others = convo.participants.filter((p) => p.userId !== currentUserId);
  if (others.length === 0) return "You";
  return others.map((p) => p.fullName ?? p.email).join(", ");
}

/** Get the last message preview text. */
function getLastMessagePreview(
  convo: ConversationPreview,
  currentUserId: string,
): string {
  if (!convo.lastMessage) return "No messages yet";

  const isMine = convo.lastMessage.sender_id === currentUserId;
  const prefix = isMine ? "You: " : "";
  const content =
    convo.lastMessage.message_type === "file"
      ? "Sent a file"
      : convo.lastMessage.content;

  return prefix + truncate(content, 60 - prefix.length);
}

/** Get initials for an avatar fallback. */
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
// Debounce hook
// ---------------------------------------------------------------------------

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function OnlineDot({ online }: { online: boolean }) {
  return (
    <span
      className={cn(
        "absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-bg-primary",
        online ? "bg-emerald-400" : "bg-text-muted/40",
      )}
      aria-label={online ? "Online" : "Offline"}
    />
  );
}

function UserAvatar({
  fullName,
  avatarUrl,
  showOnline,
  online = false,
  size = "md",
}: {
  fullName: string | null;
  avatarUrl: string | null;
  showOnline?: boolean;
  online?: boolean;
  size?: "sm" | "md";
}) {
  const px = size === "sm" ? "h-8 w-8" : "h-10 w-10";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <div className="relative shrink-0">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={fullName ?? "User"}
          className={cn(px, "rounded-full object-cover")}
        />
      ) : (
        <div
          className={cn(
            px,
            textSize,
            "flex items-center justify-center rounded-full bg-bg-elevated font-medium text-text-secondary",
          )}
        >
          {getInitials(fullName)}
        </div>
      )}
      {showOnline && <OnlineDot online={online} />}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Favorites section
// ---------------------------------------------------------------------------

function FavoritesSection({
  favorites,
  isOnline,
  onStartDM,
}: {
  favorites: FavoriteUser[];
  isOnline: (userId: string) => boolean;
  onStartDM: (userId: string) => void;
}) {
  if (favorites.length === 0) return null;

  return (
    <div className="border-b border-border-default px-4 pb-3 pt-2">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
        Favorites
      </p>
      <div className="flex flex-col gap-0.5">
        {favorites.map((fav) => (
          <button
            key={fav.userId}
            type="button"
            onClick={() => onStartDM(fav.userId)}
            className="flex min-h-[44px] items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-bg-elevated"
          >
            <UserAvatar
              fullName={fav.fullName}
              avatarUrl={fav.avatarUrl}
              showOnline
              online={isOnline(fav.userId)}
              size="sm"
            />
            <span className="min-w-0 truncate text-sm font-medium text-text-primary">
              {fav.fullName ?? fav.email}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Conversation item
// ---------------------------------------------------------------------------

function ConversationItem({
  convo,
  currentUserId,
  onSelect,
}: {
  convo: ConversationPreview;
  currentUserId: string;
  onSelect: () => void;
}) {
  const hasUnread = convo.unreadCount > 0;
  const displayName = getConversationDisplayName(convo, currentUserId);
  const preview = getLastMessagePreview(convo, currentUserId);
  const time = convo.lastMessage
    ? timeAgo(convo.lastMessage.created_at)
    : timeAgo(convo.created_at);

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex min-h-[60px] w-full items-start gap-3 rounded-lg px-4 py-2.5 text-left transition-colors hover:bg-bg-elevated"
    >
      {/* Unread indicator */}
      <div className="flex h-10 shrink-0 items-center">
        <span
          className={cn(
            "h-2 w-2 rounded-full transition-opacity",
            hasUnread ? "bg-blue-400 opacity-100" : "opacity-0",
          )}
        />
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "min-w-0 truncate text-sm",
              hasUnread
                ? "font-semibold text-text-primary"
                : "font-medium text-text-primary",
            )}
          >
            {displayName}
          </span>
          <span className="shrink-0 text-xs text-text-muted">{time}</span>
        </div>
        <p
          className={cn(
            "mt-0.5 truncate text-[13px]",
            hasUnread ? "font-medium text-text-secondary" : "text-text-muted",
          )}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ChatListPanel({
  onSelectConversation,
  onClose,
  onNewConversation,
}: ChatListPanelProps) {
  const chat = useChatContext();
  const [searchQuery, setSearchQuery] = React.useState("");
  const [favorites, setFavorites] = React.useState<FavoriteUser[]>([]);
  const [mounted, setMounted] = React.useState(false);
  const [visible, setVisible] = React.useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);

  const debouncedQuery = useDebouncedValue(searchQuery, 250);

  // Presence context — may not be available if the user has no org
  let isUserOnline: (userId: string) => boolean = () => false;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks, @typescript-eslint/no-require-imports
    const { usePresenceContext } = require("@/contexts/presence-context");
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const presence = usePresenceContext();
    isUserOnline = presence.isUserOnline;
  } catch {
    // Presence not available — all users shown as offline
  }

  // Get current user ID from the first conversation's participants (or empty string)
  const currentUserId = React.useMemo(() => {
    for (const convo of chat.conversations) {
      for (const p of convo.participants) {
        // The current user is not the "other" person; we need a different signal.
        // We'll compare with participant list and conversation data.
        // Since we don't have direct access to the current user's ID here,
        // we'll infer from conversations: the current user appears in all conversations.
        if (chat.conversations.length <= 1) return p.userId;
      }
    }

    // Find the user ID that appears in ALL conversations
    if (chat.conversations.length >= 2) {
      const firstConvoUserIds = new Set(
        chat.conversations[0].participants.map((p) => p.userId),
      );
      for (const uid of firstConvoUserIds) {
        const inAll = chat.conversations.every((c) =>
          c.participants.some((p) => p.userId === uid),
        );
        if (inAll) return uid;
      }
    }
    return "";
  }, [chat.conversations]);

  // Mount & animate in
  React.useEffect(() => {
    setMounted(true);
    // Trigger slide-in on next frame
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setVisible(true));
    });
  }, []);

  // Escape key handler
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch favorites on mount
  React.useEffect(() => {
    async function fetchFavorites() {
      try {
        const res = await fetch("/api/chat/favorites");
        if (!res.ok) return;
        const data = await res.json();
        setFavorites(data.favorites ?? []);
      } catch (err) {
        logger.error("Failed to fetch favorites:", err);
      }
    }
    fetchFavorites();
  }, []);

  // Filter conversations by search
  const filteredConversations = React.useMemo(() => {
    if (!debouncedQuery.trim()) return chat.conversations;

    const q = debouncedQuery.toLowerCase();
    return chat.conversations.filter((convo) => {
      // Match title
      if (convo.title?.toLowerCase().includes(q)) return true;
      // Match participant names / emails
      return convo.participants.some(
        (p) =>
          p.fullName?.toLowerCase().includes(q) ||
          p.email.toLowerCase().includes(q),
      );
    });
  }, [chat.conversations, debouncedQuery]);

  // Animated close
  function handleClose() {
    setVisible(false);
    setTimeout(onClose, 300);
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  }

  function handleStartDM(userId: string) {
    chat.startDirectMessage(userId);
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50"
      role="dialog"
      aria-modal="true"
      aria-label="Messages panel"
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-bg-backdrop backdrop-blur-sm transition-opacity duration-300",
          visible ? "opacity-100" : "opacity-0",
        )}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        className={cn(
          "fixed right-0 top-0 z-50 flex h-full w-[420px] max-w-full flex-col border-l border-border-default bg-bg-primary shadow-xl transition-transform duration-300 ease-out",
          visible ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <h2 className="text-lg font-semibold text-text-primary">Messages</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onNewConversation}
              className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
              aria-label="New conversation"
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
              aria-label="Close messages panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="border-b border-border-default px-4 py-2">
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted"
              aria-hidden="true"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
              className="h-11 w-full rounded-md border border-border-default bg-bg-input pl-10 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
            />
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {/* Favorites */}
          {!debouncedQuery.trim() && (
            <FavoritesSection
              favorites={favorites}
              isOnline={isUserOnline}
              onStartDM={handleStartDM}
            />
          )}

          {/* Conversations */}
          <div className="px-0 py-2">
            {debouncedQuery.trim() && filteredConversations.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-text-muted">
                No conversations found
              </p>
            ) : !debouncedQuery.trim() &&
              chat.conversations.length === 0 &&
              !chat.isLoading ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <p className="text-sm text-text-muted">
                  No conversations yet
                </p>
                <button
                  type="button"
                  onClick={onNewConversation}
                  className="rounded-md bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/90"
                >
                  Start a conversation
                </button>
              </div>
            ) : chat.isLoading ? (
              <div className="flex flex-col gap-2 px-4 py-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-lg px-4 py-2.5"
                  >
                    <div className="h-2 w-2 shrink-0 rounded-full bg-white/5" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 animate-pulse rounded bg-white/5" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-white/5" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {!debouncedQuery.trim() && (
                  <p className="px-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-text-muted">
                    All conversations
                  </p>
                )}
                {filteredConversations.map((convo) => (
                  <ConversationItem
                    key={convo.id}
                    convo={convo}
                    currentUserId={currentUserId}
                    onSelect={() => onSelectConversation(convo.id)}
                  />
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

"use client";

import * as React from "react";
import { Paperclip, Smile } from "lucide-react";

import type { MessageWithReactions, ReactionSummary } from "@/lib/chat/types";
import { ReactionPicker } from "@/components/chat/reaction-picker";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1048576).toFixed(1) + " MB";
}

function formatTime(created_at: string): string {
  return new Date(created_at).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
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
// Types
// ---------------------------------------------------------------------------

type ChatMessageProps = {
  message: MessageWithReactions;
  isOwn: boolean;
  isGroup: boolean;
  currentUserId: string;
  onReact: (messageId: string, emoji: string) => void;
  onRemoveReaction: (messageId: string, emoji: string) => void;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ChatMessage({
  message,
  isOwn,
  isGroup,
  currentUserId,
  onReact,
  onRemoveReaction,
}: ChatMessageProps) {
  const [hovered, setHovered] = React.useState(false);
  const [showPicker, setShowPicker] = React.useState(false);

  // ---- System messages ----
  if (message.message_type === "system") {
    return (
      <div className="flex justify-center px-4 py-1">
        <span className="text-xs italic text-text-muted">{message.content}</span>
      </div>
    );
  }

  // ---- Soft-deleted messages ----
  const isDeleted = message.deleted_at !== null;

  // ---- Toggle reaction ----
  function handleReactionClick(r: ReactionSummary) {
    const userReacted = r.userIds.includes(currentUserId);
    if (userReacted) {
      onRemoveReaction(message.id, r.emoji);
    } else {
      onReact(message.id, r.emoji);
    }
  }

  function handlePickerSelect(emoji: string) {
    setShowPicker(false);
    onReact(message.id, emoji);
  }

  // ---- File attachment rendering ----
  function renderFileContent() {
    if (message.message_type !== "file" || !message.file_url) return null;
    return (
      <a
        href={message.file_url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-1 flex items-center gap-2 rounded-lg border border-border-default bg-bg-primary/50 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated"
      >
        <Paperclip className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span className="min-w-0 truncate font-medium text-text-primary">
          {message.file_name ?? "File"}
        </span>
        {message.file_size != null && (
          <span className="shrink-0 text-xs text-text-muted">
            {formatFileSize(message.file_size)}
          </span>
        )}
      </a>
    );
  }

  // ---- Reactions row ----
  function renderReactions() {
    if (!message.reactions || message.reactions.length === 0) return null;
    return (
      <div className="mt-1 flex flex-wrap gap-1">
        {message.reactions.map((r) => {
          const userReacted = r.userIds.includes(currentUserId);
          return (
            <button
              key={r.emoji}
              type="button"
              onClick={() => handleReactionClick(r)}
              className={`cursor-pointer rounded-full border px-2 py-0.5 text-xs transition-colors ${
                userReacted
                  ? "border-accent/30 bg-accent/10"
                  : "border-border-default bg-bg-elevated"
              }`}
            >
              {r.emoji} {r.count}
            </button>
          );
        })}
      </div>
    );
  }

  // ---- Avatar for other users ----
  function renderAvatar() {
    if (isOwn || !isGroup) return null;

    const info = message.senderInfo;
    if (info.avatarUrl) {
      return (
        <img
          src={info.avatarUrl}
          alt={info.fullName ?? "User"}
          className="h-8 w-8 shrink-0 rounded-full object-cover"
        />
      );
    }
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-text-secondary">
        {getInitials(info.fullName)}
      </div>
    );
  }

  // ---- Layout ----
  return (
    <div
      className={`group relative flex gap-2 px-4 py-1 ${
        isOwn ? "flex-row-reverse" : "flex-row"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        setShowPicker(false);
      }}
    >
      {/* Avatar */}
      {renderAvatar()}

      {/* Bubble column */}
      <div className={`flex max-w-[75%] flex-col ${isOwn ? "items-end" : "items-start"}`}>
        {/* Sender name for group chats */}
        {!isOwn && isGroup && message.senderInfo.fullName && (
          <span className="mb-0.5 px-1 text-[11px] font-medium text-text-muted">
            {message.senderInfo.fullName}
          </span>
        )}

        {/* Message bubble */}
        <div
          className={`relative rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? "bg-accent/15 text-text-primary"
              : "bg-bg-elevated text-text-primary"
          }`}
        >
          {isDeleted ? (
            <span className="italic text-text-muted">This message was deleted</span>
          ) : (
            <>
              {/* Text content */}
              {message.content && (
                <p className="whitespace-pre-wrap break-words">{message.content}</p>
              )}

              {/* File attachment */}
              {renderFileContent()}
            </>
          )}

          {/* Hover action button */}
          {hovered && !isDeleted && (
            <div
              className={`absolute -top-3 ${
                isOwn ? "left-0" : "right-0"
              }`}
            >
              <button
                type="button"
                onClick={() => setShowPicker((prev) => !prev)}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-border-default bg-bg-secondary shadow-sm transition-colors hover:bg-bg-elevated"
                aria-label="Add reaction"
              >
                <Smile className="h-3.5 w-3.5 text-text-muted" />
              </button>

              {/* Reaction picker */}
              {showPicker && (
                <div className={`absolute bottom-full mb-1 ${isOwn ? "left-0" : "right-0"}`}>
                  <ReactionPicker
                    onSelect={handlePickerSelect}
                    onClose={() => setShowPicker(false)}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timestamp — visible on hover */}
        <span
          className={`mt-0.5 px-1 text-[10px] text-text-muted transition-opacity ${
            hovered ? "opacity-100" : "opacity-0"
          }`}
        >
          {formatTime(message.created_at)}
        </span>

        {/* Reactions */}
        {renderReactions()}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, Star, X } from "lucide-react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { ParticipantInfo } from "@/lib/chat/types";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils/cn";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NewConversationModalProps = {
  orgId: string;
  onCreated: (conversationId: string) => void;
  onClose: () => void;
};

type MemberInfo = ParticipantInfo & {
  isFavorite: boolean;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
// Focus trap hook
// ---------------------------------------------------------------------------

function useFocusTrap(ref: React.RefObject<HTMLDivElement | null>) {
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const focusable = el.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    // Focus the first element on mount
    first?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, [ref]);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NewConversationModal({
  orgId,
  onCreated,
  onClose,
}: NewConversationModalProps) {
  const [members, setMembers] = React.useState<MemberInfo[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = React.useState("");
  const [groupTitle, setGroupTitle] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [creating, setCreating] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);

  const modalRef = React.useRef<HTMLDivElement>(null);

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

  useFocusTrap(modalRef);

  // Mount
  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Fetch org members + favorites
  React.useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      try {
        const supabase = createSupabaseBrowserClient();

        // Get current user
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        // Fetch org members
        const { data: orgMembers, error: orgError } = await supabase
          .from("organization_members")
          .select(
            "user_id, users!inner(id, full_name, email, avatar_url)",
          )
          .eq("organization_id", orgId);

        if (orgError) {
          logger.error("Failed to fetch org members:", orgError);
          return;
        }

        // Fetch favorites
        const { data: favs } = await supabase
          .from("user_favorites")
          .select("favorite_user_id")
          .eq("user_id", user.id);

        const favoriteIds = new Set(
          (favs ?? []).map((f) => f.favorite_user_id),
        );

        if (cancelled) return;

        // Map to MemberInfo, filtering out current user
        const mapped: MemberInfo[] = (orgMembers ?? [])
          .map((m) => {
            const u = Array.isArray(m.users) ? m.users[0] : m.users;
            return {
              userId: m.user_id,
              fullName: u?.full_name ?? null,
              email: u?.email ?? "",
              avatarUrl: u?.avatar_url ?? null,
              isFavorite: favoriteIds.has(m.user_id),
            };
          })
          .filter((m) => m.userId !== user.id);

        // Sort: favorites first, then alphabetically
        mapped.sort((a, b) => {
          if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1;
          const nameA = (a.fullName ?? a.email).toLowerCase();
          const nameB = (b.fullName ?? b.email).toLowerCase();
          return nameA.localeCompare(nameB);
        });

        setMembers(mapped);
      } catch (err) {
        logger.error("Failed to fetch members:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [orgId]);

  // Filtered members
  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const q = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.fullName?.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q),
    );
  }, [members, searchQuery]);

  // Selected members info
  const selectedMembers = React.useMemo(
    () => members.filter((m) => selectedIds.has(m.userId)),
    [members, selectedIds],
  );

  const isGroupMode = selectedIds.size >= 2;

  // ------- Actions -------

  function toggleSelection(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  }

  function removeSelection(userId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(userId);
      return next;
    });
  }

  async function toggleFavorite(userId: string, currentlyFavorite: boolean) {
    try {
      if (currentlyFavorite) {
        await fetch(`/api/chat/favorites/${userId}`, { method: "DELETE" });
      } else {
        await fetch("/api/chat/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      }

      // Update local state
      setMembers((prev) =>
        prev.map((m) =>
          m.userId === userId ? { ...m, isFavorite: !currentlyFavorite } : m,
        ),
      );
    } catch (err) {
      logger.error("Failed to toggle favorite:", err);
    }
  }

  async function handleCreate() {
    if (selectedIds.size === 0 || creating) return;

    setCreating(true);
    try {
      const body: Record<string, unknown> = {
        participantIds: Array.from(selectedIds),
      };

      if (isGroupMode) {
        body.isGroup = true;
        if (groupTitle.trim()) {
          body.title = groupTitle.trim();
        }
      }

      const res = await fetch("/api/chat/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        logger.error("Failed to create conversation:", res.status);
        return;
      }

      const data = await res.json();
      onCreated(data.id);
    } catch (err) {
      logger.error("Failed to create conversation:", err);
    } finally {
      setCreating(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) onClose();
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label="New conversation"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative z-[60] w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6"
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text-primary">
            New Conversation
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Selected pills */}
        {selectedMembers.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {selectedMembers.map((m) => (
              <span
                key={m.userId}
                className="flex items-center gap-1 rounded-full border border-border-default bg-bg-elevated px-2.5 py-1 text-xs text-text-primary"
              >
                {m.fullName ?? m.email}
                <button
                  type="button"
                  onClick={() => removeSelection(m.userId)}
                  className="ml-0.5 flex h-4 w-4 items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-primary"
                  aria-label={`Remove ${m.fullName ?? m.email}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Search */}
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search members..."
          className="mb-3 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
        />

        {/* Group title (when 2+ selected) */}
        {isGroupMode && (
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="Group name (optional)"
            className="mb-3 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
          />
        )}

        {/* Members list */}
        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-border-default">
          {loading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-9 w-9 animate-pulse rounded-full bg-white/5" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3.5 w-2/3 animate-pulse rounded bg-white/5" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredMembers.length === 0 ? (
            <p className="px-3 py-6 text-center text-sm text-text-muted">
              {searchQuery.trim() ? "No members found" : "No team members"}
            </p>
          ) : (
            <div className="py-1">
              {filteredMembers.map((member) => {
                const isSelected = selectedIds.has(member.userId);
                const online = isUserOnline(member.userId);

                return (
                  <div
                    key={member.userId}
                    className="flex items-center gap-2 px-3 py-2"
                  >
                    {/* Checkbox area */}
                    <button
                      type="button"
                      onClick={() => toggleSelection(member.userId)}
                      className={cn(
                        "flex min-h-[44px] flex-1 items-center gap-3 rounded-lg px-1 py-1 text-left transition-colors hover:bg-bg-elevated",
                      )}
                      aria-pressed={isSelected}
                      aria-label={`Select ${member.fullName ?? member.email}`}
                    >
                      {/* Checkbox */}
                      <div
                        className={cn(
                          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
                          isSelected
                            ? "border-white bg-white text-black"
                            : "border-border-default bg-transparent",
                        )}
                      >
                        {isSelected && (
                          <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        )}
                      </div>

                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {member.avatarUrl ? (
                          <img
                            src={member.avatarUrl}
                            alt={member.fullName ?? "User"}
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-text-secondary">
                            {getInitials(member.fullName)}
                          </div>
                        )}
                        <span
                          className={cn(
                            "absolute bottom-0 right-0 h-2 w-2 rounded-full border-[1.5px] border-zinc-900",
                            online ? "bg-emerald-400" : "bg-text-muted/40",
                          )}
                          aria-label={online ? "Online" : "Offline"}
                        />
                      </div>

                      {/* Name + email */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-text-primary">
                          {member.fullName ?? member.email}
                        </p>
                        {member.fullName && (
                          <p className="truncate text-xs text-text-muted">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Star toggle */}
                    <button
                      type="button"
                      onClick={() =>
                        toggleFavorite(member.userId, member.isFavorite)
                      }
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-md transition-colors",
                        member.isFavorite
                          ? "text-amber-400 hover:text-amber-300"
                          : "text-text-muted/40 hover:text-text-muted",
                      )}
                      aria-label={
                        member.isFavorite
                          ? `Remove ${member.fullName ?? member.email} from favorites`
                          : `Add ${member.fullName ?? member.email} to favorites`
                      }
                    >
                      <Star
                        className="h-4 w-4"
                        fill={member.isFavorite ? "currentColor" : "none"}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={selectedIds.size === 0 || creating}
          className="mt-4 h-11 w-full rounded-md bg-white text-sm font-medium text-black transition-colors hover:bg-white/90 disabled:opacity-60"
        >
          {creating
            ? "Creating..."
            : isGroupMode
              ? "Create Group"
              : "Start Chat"}
        </button>
      </div>
    </div>,
    document.body,
  );
}

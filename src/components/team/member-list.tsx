"use client";

import * as React from "react";
import { Crown, UserMinus, Loader2 } from "lucide-react";
import { MemberRoleSelector } from "./member-role-selector";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
};

type Props = {
  orgId: string;
  members: Member[];
  myRole: string;
  currentUserId: string;
  ownerId: string;
  onMemberUpdated: () => void;
};

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  member: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  viewer: "bg-bg-hover text-text-tertiary",
};

export function MemberList({
  orgId,
  members,
  myRole,
  currentUserId,
  ownerId,
  onMemberUpdated,
}: Props) {
  const [updating, setUpdating] = React.useState<string | null>(null);
  const [removeModal, setRemoveModal] = React.useState<{
    open: boolean;
    member: Member | null;
  }>({ open: false, member: null });
  const [error, setError] = React.useState<string | null>(null);

  const isAdmin = myRole === "admin";

  async function handleRoleChange(userId: string, newRole: string) {
    setUpdating(userId);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/members/${userId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to update role.");
      }
      onMemberUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdating(null);
    }
  }

  async function handleRemove() {
    const member = removeModal.member;
    if (!member) return;
    setRemoveModal({ open: false, member: null });
    setUpdating(member.userId);
    setError(null);
    try {
      const res = await fetch(
        `/api/organizations/${orgId}/members/${member.userId}`,
        { method: "DELETE" },
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to remove member.");
      }
      onMemberUpdated();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
        {members.map((member) => {
          const isOwner = member.userId === ownerId;
          const isSelf = member.userId === currentUserId;
          const isBeingUpdated = updating === member.userId;

          return (
            <div
              key={member.id}
              className="flex items-center gap-4 px-4 py-3"
            >
              {/* Avatar */}
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-default bg-bg-elevated">
                <span className="text-sm font-medium text-text-tertiary">
                  {(member.name || member.email).charAt(0).toUpperCase()}
                </span>
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">
                    {member.name || member.email}
                  </span>
                  {isOwner && (
                    <Crown className="h-3.5 w-3.5 text-amber-400" aria-label="Owner" />
                  )}
                  {isSelf && (
                    <span className="text-[10px] text-text-muted">(you)</span>
                  )}
                </div>
                <div className="text-xs text-text-muted truncate">
                  {member.email}
                </div>
              </div>

              {/* Role */}
              {isAdmin && !isSelf && !isOwner ? (
                <div className="flex items-center gap-2">
                  {isBeingUpdated ? (
                    <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                  ) : (
                    <>
                      <MemberRoleSelector
                        value={member.role}
                        onChange={(r) => handleRoleChange(member.userId, r)}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setRemoveModal({ open: true, member })
                        }
                        className="rounded-md p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-[var(--status-error-text)] focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                        title="Remove member"
                        aria-label={`Remove ${member.name || member.email}`}
                      >
                        <UserMinus className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    roleBadgeStyles[member.role] ?? roleBadgeStyles.viewer
                  }`}
                >
                  {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={removeModal.open}
        title="Remove Member"
        message={
          removeModal.member
            ? `Remove ${removeModal.member.name || removeModal.member.email} from the team? They will lose access to shared data.`
            : ""
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveModal({ open: false, member: null })}
      />
    </div>
  );
}

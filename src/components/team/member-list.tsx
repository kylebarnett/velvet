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
  admin: "bg-amber-500/20 text-amber-200",
  member: "bg-blue-500/20 text-blue-200",
  viewer: "bg-white/10 text-white/60",
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
    } catch (err) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setUpdating(null);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
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
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <span className="text-sm font-medium text-white/60">
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
                    <span className="text-[10px] text-white/40">(you)</span>
                  )}
                </div>
                <div className="text-xs text-white/40 truncate">
                  {member.email}
                </div>
              </div>

              {/* Role */}
              {isAdmin && !isSelf && !isOwner ? (
                <div className="flex items-center gap-2">
                  {isBeingUpdated ? (
                    <Loader2 className="h-4 w-4 animate-spin text-white/40" />
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
                        className="rounded-md p-1.5 text-red-400/60 hover:bg-red-500/10 hover:text-red-300 focus:outline-none focus:ring-2 focus:ring-white/20"
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

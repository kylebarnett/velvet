"use client";

import * as React from "react";
import { Mail, X, Clock } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

type Props = {
  orgId: string;
  invitations: Invitation[];
  isAdmin: boolean;
  onUpdated: () => void;
};

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  member: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  viewer: "bg-bg-hover text-text-tertiary",
};

export function PendingInvitations({
  orgId,
  invitations,
  isAdmin,
  onUpdated,
}: Props) {
  const [cancelling, setCancelling] = React.useState<string | null>(null);
  const [cancelModal, setCancelModal] = React.useState<{
    open: boolean;
    invitation: Invitation | null;
  }>({ open: false, invitation: null });

  const pending = invitations.filter((inv) => inv.status === "pending");

  if (pending.length === 0) return null;

  async function handleCancel() {
    const inv = cancelModal.invitation;
    if (!inv) return;

    setCancelModal({ open: false, invitation: null });
    setCancelling(inv.id);
    try {
      await fetch(
        `/api/organizations/${orgId}/invitations/${inv.id}`,
        { method: "DELETE" },
      );
      onUpdated();
    } catch {
      // Silent fail — non-critical
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div>
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
        Pending Invitations ({pending.length})
      </h3>
      <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
        {pending.map((inv) => {
          const isExpired = new Date(inv.expires_at) < new Date();
          return (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Mail className="h-4 w-4 shrink-0 text-text-faint" />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{inv.email}</div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-text-muted">
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      roleBadgeStyles[inv.role] ?? roleBadgeStyles.viewer
                    }`}
                  >
                    {inv.role}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {isExpired ? (
                      <span className="text-[var(--status-error-text)]">Expired</span>
                    ) : (
                      `Expires ${new Date(inv.expires_at).toLocaleDateString()}`
                    )}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setCancelModal({ open: true, invitation: inv })}
                  disabled={cancelling === inv.id}
                  className="rounded-md p-1.5 text-text-faint hover:bg-bg-elevated hover:text-text-tertiary disabled:opacity-60"
                  title="Cancel invitation"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      <ConfirmModal
        open={cancelModal.open}
        title="Cancel Invitation"
        message={
          cancelModal.invitation
            ? `Cancel the invitation to ${cancelModal.invitation.email}? They will no longer be able to join your team with this link.`
            : ""
        }
        confirmLabel="Cancel Invitation"
        cancelLabel="Keep"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelModal({ open: false, invitation: null })}
      />
    </div>
  );
}

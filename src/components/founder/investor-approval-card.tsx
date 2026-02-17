"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { HelpTooltip } from "@/components/ui/help-tooltip";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type Investor = {
  id: string;
  investor_id: string;
  approval_status: string;
  is_inviting_investor: boolean;
  created_at: string;
  org_name?: string | null;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

type DataCounts = {
  metrics: number;
  documents: number;
  tearSheets: number;
};

function formatConnectionDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function InvestorApprovalCard({
  investor,
  dataCounts,
}: {
  investor: Investor;
  dataCounts?: DataCounts;
}) {
  const [status, setStatus] = React.useState(investor.approval_status);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [confirmAction, setConfirmAction] = React.useState<"approved" | "denied" | null>(null);

  const investorUser = investor.users;
  const displayName = investorUser?.full_name || investorUser?.email || "Unknown";
  const initial = (investorUser?.full_name?.[0] || investorUser?.email?.[0] || "?").toUpperCase();
  const orgLabel = investor.org_name || "Individual investor";

  async function handleApproval(newStatus: "approved" | "denied") {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/founder/investors/${investor.id}/approval`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to update.");
      setStatus(newStatus);
      toast.success(
        newStatus === "approved"
          ? `${displayName} approved — they can now view your data.`
          : `Access denied for ${displayName}.`
      );
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function requestApproval(action: "approved" | "denied") {
    setConfirmAction(action);
  }

  function confirmApproval() {
    if (!confirmAction) return;
    handleApproval(confirmAction);
    setConfirmAction(null);
  }

  const statusBadge = {
    auto_approved: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    approved: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    pending: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
    denied: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
  }[status] ?? "bg-bg-hover text-text-tertiary";

  const statusLabel = {
    auto_approved: "Approved",
    approved: "Approved",
    pending: "Pending review",
    denied: "Access denied",
  }[status] ?? status;

  // Build confirmation messages
  const approveMessage = dataCounts
    ? `Approve ${displayName} from ${orgLabel}? They'll immediately see:\n\n• ${dataCounts.metrics} metric value${dataCounts.metrics !== 1 ? "s" : ""}\n• ${dataCounts.documents} document${dataCounts.documents !== 1 ? "s" : ""}\n• ${dataCounts.tearSheets} tear sheet${dataCounts.tearSheets !== 1 ? "s" : ""}\n\nYou can revoke access anytime.`
    : `Approve ${displayName} from ${orgLabel}? They'll be able to see all your submitted metrics, documents, and tear sheets. You can revoke access anytime.`;

  const denyMessage = status === "approved" || status === "auto_approved"
    ? `Deny access for ${displayName} from ${orgLabel}? They will no longer be able to see any of your data.`
    : `Deny ${displayName} from ${orgLabel}? They won't be able to see any of your data.`;

  return (
    <>
      <div className="rounded-xl border border-border-default card-surface p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="flex min-w-0 gap-3">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-sm font-medium text-text-secondary"
              aria-hidden="true"
            >
              {initial}
            </div>
            <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-text-primary">{displayName}</span>
              {investor.is_inviting_investor && (
                <span className="rounded-full bg-[var(--status-info-bg)] px-2 py-0.5 text-xs text-[var(--status-info-text)]">
                  Invited you
                </span>
              )}
            </div>
            <div className="mt-0.5 text-xs text-text-tertiary">{orgLabel}</div>
            {investorUser?.email && investorUser.full_name && (
              <div className="mt-0.5 text-xs text-text-muted">{investorUser.email}</div>
            )}
            <div className="mt-0.5 text-xs text-text-muted">
              Connected {formatConnectionDate(investor.created_at)}
            </div>
            <div className="mt-2 flex items-center gap-1.5">
              <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}>
                {statusLabel}
              </span>
              {status === "auto_approved" && (
                <HelpTooltip text="This investor invited you to Velvet and was automatically approved. They can see all your submitted metrics and documents." />
              )}
              {status === "pending" && (
                <HelpTooltip text="This investor added your company to their portfolio and is waiting for your approval. They cannot see any of your data until you approve access." />
              )}
              {status === "approved" && (
                <HelpTooltip text="This investor can view all your submitted metrics and documents. You can revoke access at any time." />
              )}
              {status === "denied" && (
                <HelpTooltip text="This investor cannot see your metrics or documents. You can approve them at any time to grant access." />
              )}
            </div>
            </div>
          </div>

          {status === "pending" && (
            <div className="flex shrink-0 gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => requestApproval("approved")}
                disabled={loading}
                type="button"
                className="flex-1 sm:flex-none"
              >
                Approve
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => requestApproval("denied")}
                disabled={loading}
                type="button"
                className="flex-1 sm:flex-none"
              >
                Deny
              </Button>
            </div>
          )}

          {status === "approved" && (
            <Button
              variant="secondary"
              size="sm"
              className="shrink-0"
              onClick={() => requestApproval("denied")}
              disabled={loading}
              type="button"
            >
              Deny access
            </Button>
          )}

          {status === "denied" && (
            <Button
              variant="primary"
              size="sm"
              className="shrink-0"
              onClick={() => requestApproval("approved")}
              disabled={loading}
              type="button"
            >
              Approve
            </Button>
          )}
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-xs text-[var(--status-error-text)]">
            {error}
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmAction === "approved"}
        title={`Approve ${displayName}?`}
        message={approveMessage}
        confirmLabel="Approve"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={confirmApproval}
        onCancel={() => setConfirmAction(null)}
      />
      <ConfirmModal
        open={confirmAction === "denied"}
        title={`Deny ${displayName}?`}
        message={denyMessage}
        confirmLabel="Deny access"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmApproval}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
}

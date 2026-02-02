"use client";

import * as React from "react";

type Investor = {
  id: string;
  investor_id: string;
  approval_status: string;
  is_inviting_investor: boolean;
  created_at: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

export function InvestorApprovalCard({ investor }: { investor: Investor }) {
  const [status, setStatus] = React.useState(investor.approval_status);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const investorUser = investor.users;
  const displayName = investorUser?.full_name || investorUser?.email || "Unknown";

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
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const statusBadge = {
    auto_approved: "bg-emerald-500/20 text-emerald-200",
    approved: "bg-emerald-500/20 text-emerald-200",
    pending: "bg-amber-500/20 text-amber-200",
    denied: "bg-red-500/20 text-red-200",
  }[status] ?? "bg-white/10 text-white/60";

  const statusLabel = {
    auto_approved: "Auto-approved",
    approved: "Approved",
    pending: "Pending",
    denied: "Denied",
  }[status] ?? status;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            {investor.is_inviting_investor && (
              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                Invited you
              </span>
            )}
          </div>
          {investorUser?.email && investorUser.full_name && (
            <div className="mt-0.5 text-xs text-white/50">{investorUser.email}</div>
          )}
          <div className="mt-2">
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusBadge}`}>
              {statusLabel}
            </span>
          </div>
        </div>

        {status === "pending" && (
          <div className="flex shrink-0 gap-2">
            <button
              className="inline-flex h-9 sm:h-8 flex-1 sm:flex-none items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60"
              onClick={() => handleApproval("approved")}
              disabled={loading}
              type="button"
            >
              Approve
            </button>
            <button
              className="inline-flex h-9 sm:h-8 flex-1 sm:flex-none items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
              onClick={() => handleApproval("denied")}
              disabled={loading}
              type="button"
            >
              Deny
            </button>
          </div>
        )}

        {status === "approved" && (
          <button
            className="inline-flex h-9 sm:h-8 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/5 px-3 text-xs font-medium text-white hover:bg-white/10 disabled:opacity-60"
            onClick={() => handleApproval("denied")}
            disabled={loading}
            type="button"
          >
            Revoke
          </button>
        )}

        {status === "denied" && (
          <button
            className="inline-flex h-9 sm:h-8 shrink-0 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60"
            onClick={() => handleApproval("approved")}
            disabled={loading}
            type="button"
          >
            Approve
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          {error}
        </div>
      )}
    </div>
  );
}

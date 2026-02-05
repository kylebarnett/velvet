"use client";

import * as React from "react";
import { Mail, X, Clock } from "lucide-react";

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
  admin: "bg-amber-500/20 text-amber-200",
  member: "bg-blue-500/20 text-blue-200",
  viewer: "bg-white/10 text-white/60",
};

export function PendingInvitations({
  orgId,
  invitations,
  isAdmin,
  onUpdated,
}: Props) {
  const [cancelling, setCancelling] = React.useState<string | null>(null);

  const pending = invitations.filter((inv) => inv.status === "pending");

  if (pending.length === 0) return null;

  async function handleCancel(invId: string) {
    setCancelling(invId);
    try {
      await fetch(
        `/api/organizations/${orgId}/invitations/${invId}`,
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
      <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
        Pending Invitations ({pending.length})
      </h3>
      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/5">
        {pending.map((inv) => {
          const isExpired = new Date(inv.expires_at) < new Date();
          return (
            <div
              key={inv.id}
              className="flex items-center gap-3 px-4 py-3"
            >
              <Mail className="h-4 w-4 shrink-0 text-white/30" />
              <div className="min-w-0 flex-1">
                <div className="text-sm truncate">{inv.email}</div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-white/40">
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
                      <span className="text-red-300">Expired</span>
                    ) : (
                      `Expires ${new Date(inv.expires_at).toLocaleDateString()}`
                    )}
                  </span>
                </div>
              </div>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => handleCancel(inv.id)}
                  disabled={cancelling === inv.id}
                  className="rounded-md p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60 disabled:opacity-40"
                  title="Cancel invitation"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { X, Copy, Check } from "lucide-react";
import { MemberRoleSelector } from "./member-role-selector";

type Props = {
  orgId: string;
  open: boolean;
  onClose: () => void;
  onInvited: () => void;
};

export function InviteMemberModal({ orgId, open, onClose, onInvited }: Props) {
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState("member");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setEmail("");
      setRole("member");
      setError(null);
      setInviteUrl(null);
      setCopied(false);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleInvite() {
    if (!email.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/organizations/${orgId}/invitations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), role }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to send invitation.");

      setInviteUrl(json.inviteUrl);
      onInvited();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  async function copyLink() {
    if (!inviteUrl) return;
    await navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Invite Team Member</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                Invitation created for {email}
              </div>
              <div>
                <label className="text-xs text-white/60">
                  Invite Link (Dev Mode)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="h-9 flex-1 rounded-md border border-white/10 bg-black/30 px-3 text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={copyLink}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs hover:bg-white/10"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="h-9 w-full rounded-md border border-white/10 bg-white/5 text-sm hover:bg-white/10"
              >
                Done
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-white/60">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
                />
              </div>
              <div>
                <label className="text-xs text-white/60">Role</label>
                <div className="mt-1">
                  <MemberRoleSelector value={role} onChange={setRole} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 rounded-md border border-white/10 bg-white/5 px-4 text-sm hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleInvite}
                  disabled={submitting || !email.trim()}
                  className="h-9 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
                >
                  {submitting ? "Sending..." : "Send Invitation"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

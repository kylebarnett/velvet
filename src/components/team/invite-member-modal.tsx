"use client";

import * as React from "react";
import { X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
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
    } catch (err: unknown) {
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
        className="fixed inset-0 z-50 bg-bg-backdrop backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold">Invite Team Member</h3>
            <button
              onClick={onClose}
              className="rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-tertiary"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          {inviteUrl ? (
            <div className="space-y-4">
              <div className="rounded-md border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-text)]">
                Invitation created for {email}
              </div>
              <div>
                <label className="text-xs text-text-tertiary">
                  Invite Link (Dev Mode)
                </label>
                <div className="mt-1 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteUrl}
                    className="h-9 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-xs font-mono outline-none"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={copyLink}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-[var(--success-accent)]" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>
              </div>
              <Button
                variant="secondary"
                onClick={onClose}
                className="w-full"
              >
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-text-tertiary">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="mt-1 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
                />
              </div>
              <div>
                <label className="text-xs text-text-tertiary">Role</label>
                <div className="mt-1">
                  <MemberRoleSelector value={role} onChange={setRole} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleInvite}
                  disabled={submitting || !email.trim()}
                >
                  {submitting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

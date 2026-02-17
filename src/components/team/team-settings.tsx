"use client";

import * as React from "react";
import { Plus, Loader2, Camera, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MemberList } from "./member-list";
import { PendingInvitations } from "./pending-invitations";
import { InviteMemberModal } from "./invite-member-modal";
import { logger } from "@/lib/logger";

type Member = {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  joinedAt: string;
};

type Invitation = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
};

type Org = {
  id: string;
  name: string;
  orgType: string;
  ownerId: string;
  logoUrl: string | null;
  myRole: string;
};

type Props = {
  currentUserId: string;
};

export function TeamSettings({ currentUserId }: Props) {
  const [org, setOrg] = React.useState<Org | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [invitations, setInvitations] = React.useState<Invitation[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = React.useState(false);
  const [creating, setCreating] = React.useState(false);
  const [orgName, setOrgName] = React.useState("");
  const [logoUploading, setLogoUploading] = React.useState(false);
  const [logoError, setLogoError] = React.useState<string | null>(null);
  const [imgError, setImgError] = React.useState(false);
  const [showLogoMenu, setShowLogoMenu] = React.useState(false);
  const logoInputRef = React.useRef<HTMLInputElement>(null);
  const logoMenuRef = React.useRef<HTMLDivElement>(null);

  // Close logo menu on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (logoMenuRef.current && !logoMenuRef.current.contains(e.target as Node)) {
        setShowLogoMenu(false);
      }
    }
    if (showLogoMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showLogoMenu]);

  React.useEffect(() => {
    if (logoError) {
      const timer = setTimeout(() => setLogoError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoError]);

  async function loadData() {
    try {
      const res = await fetch("/api/organizations");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to load.");

      const orgs = json.organizations ?? [];
      if (orgs.length > 0) {
        const myOrg = orgs[0];
        setOrg(myOrg);

        // Load members and invitations
        const [membersRes, invitationsRes] = await Promise.all([
          fetch(`/api/organizations/${myOrg.id}/members`),
          fetch(`/api/organizations/${myOrg.id}/invitations`),
        ]);

        const membersJson = await membersRes.json();
        const invitationsJson = await invitationsRes.json();

        if (!membersRes.ok) {
          logger.error("Failed to load members:", membersJson);
        }
        if (!invitationsRes.ok) {
          logger.error("Failed to load invitations:", invitationsJson);
        }

        setMembers(membersJson.members ?? []);
        setInvitations(invitationsJson.invitations ?? []);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadData();
  }, []);

  async function handleCreateOrg() {
    if (!orgName.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: orgName.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create team.");

      // Set org state directly from the creation response
      // This avoids race conditions with loadData() not seeing the new org yet
      setOrg({
        id: json.id,
        name: orgName.trim(),
        orgType: json.orgType ?? "investor", // Will be set by server based on user role
        ownerId: currentUserId,
        logoUrl: null,
        myRole: "admin",
      });

      // Set self as the initial member
      setMembers([{
        id: json.id, // Placeholder
        userId: currentUserId,
        email: "", // Will be loaded on refresh
        name: "You",
        role: "admin",
        joinedAt: new Date().toISOString(),
      }]);

      setOrgName("");
      setInvitations([]);

      // Refresh in background to get full data
      loadData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-text-muted" />
      </div>
    );
  }

  // No org yet — show creation form
  if (!org) {
    return (
      <div className="space-y-6">
        <div className="py-8">
          <h3 className="text-base font-medium text-text-primary">Create a Team</h3>
          <p className="mt-1 max-w-lg text-sm text-text-secondary">
            Invite team members to collaborate on your portfolio. Team members
            share access to portfolio data based on their role.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          <div className="mt-4 flex gap-2 max-w-xs">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Team name"
              className="h-11 flex-1 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateOrg();
              }}
            />
            <Button
              size="lg"
              onClick={handleCreateOrg}
              disabled={creating || !orgName.trim()}
            >
              {creating ? "Creating..." : "Create"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = org.myRole === "admin";
  const orgInitial = org.name.charAt(0).toUpperCase();

  async function handleLogoUpload(file: File) {
    if (!org) return;
    setLogoUploading(true);
    setLogoError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/organizations/${org.id}/logo`, {
        method: "POST",
        body: formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to upload logo.");
      setImgError(false);
      setOrg((prev) => prev ? { ...prev, logoUrl: json.logoUrl } : prev);
    } catch (err: unknown) {
      setLogoError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  async function handleLogoRemove() {
    if (!org) return;
    setLogoUploading(true);
    setLogoError(null);
    setShowLogoMenu(false);
    try {
      const res = await fetch(`/api/organizations/${org.id}/logo`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to remove logo.");
      setImgError(false);
      setOrg((prev) => prev ? { ...prev, logoUrl: null } : prev);
    } catch (err: unknown) {
      setLogoError(err instanceof Error ? err.message : "Remove failed.");
    } finally {
      setLogoUploading(false);
    }
  }

  function handleLogoClick() {
    if (!org || !isAdmin || logoUploading) return;
    if (org.logoUrl) {
      setShowLogoMenu(true);
    } else {
      logoInputRef.current?.click();
    }
  }

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              role={isAdmin ? "button" : undefined}
              tabIndex={isAdmin ? 0 : undefined}
              onClick={handleLogoClick}
              onKeyDown={(e) => {
                if (isAdmin && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleLogoClick();
                }
              }}
              className={`
                relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg
                border border-border-default bg-bg-elevated
                ${isAdmin ? "cursor-pointer group" : ""}
                ${logoUploading ? "opacity-60" : ""}
              `}
              title={isAdmin ? (org.logoUrl ? "Click to change logo" : "Click to upload fund logo") : org.name}
            >
              {org.logoUrl && !imgError ? (
                <img
                  src={org.logoUrl}
                  alt={org.name}
                  className="h-full w-full object-cover"
                  onError={() => setImgError(true)}
                />
              ) : (
                <span className="text-sm font-semibold text-text-tertiary">{orgInitial}</span>
              )}
              {isAdmin && !logoUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-backdrop opacity-0 transition-opacity group-hover:opacity-100">
                  <Camera className="h-4 w-4 text-text-primary" />
                </div>
              )}
              {logoUploading && (
                <div className="absolute inset-0 flex items-center justify-center bg-bg-backdrop">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-border-default border-t-white/80" />
                </div>
              )}
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleLogoUpload(file);
                  e.target.value = "";
                }}
                className="hidden"
              />
            </div>

            {showLogoMenu && (
              <div
                ref={logoMenuRef}
                className="absolute left-0 top-full z-50 mt-2 min-w-[140px] overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
              >
                <button
                  onClick={() => {
                    setShowLogoMenu(false);
                    logoInputRef.current?.click();
                  }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                >
                  <Camera className="h-4 w-4" />
                  Change
                </button>
                <div className="mx-2 border-t border-border-default" />
                <button
                  onClick={handleLogoRemove}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-[var(--status-error-text)] transition-colors hover:bg-bg-elevated"
                >
                  <X className="h-4 w-4" />
                  Remove
                </button>
              </div>
            )}

            {logoError && (
              <div className="absolute left-0 top-full z-50 mt-1 whitespace-nowrap rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-2 py-1 text-xs text-[var(--status-error-text)]">
                {logoError}
              </div>
            )}
          </div>
          <div>
            <h2 className="font-semibold">{org.name}</h2>
            <p className="text-xs text-text-tertiary">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <Button
            onClick={() => setShowInviteModal(true)}
          >
            <Plus className="h-4 w-4" />
            Invite
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {/* Members */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
          Members
        </h3>
        <MemberList
          orgId={org.id}
          members={members}
          myRole={org.myRole}
          currentUserId={currentUserId}
          ownerId={org.ownerId}
          onMemberUpdated={loadData}
        />
      </div>

      {/* Pending invitations */}
      <PendingInvitations
        orgId={org.id}
        invitations={invitations}
        isAdmin={isAdmin}
        onUpdated={loadData}
      />

      {/* Invite modal */}
      <InviteMemberModal
        orgId={org.id}
        open={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvited={loadData}
      />
    </div>
  );
}

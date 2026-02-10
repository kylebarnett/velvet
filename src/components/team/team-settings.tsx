"use client";

import * as React from "react";
import { Users, Plus, Loader2, Settings } from "lucide-react";
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
        <div className="rounded-xl border border-border-default bg-bg-elevated p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-text-faint" />
          <h3 className="mt-4 text-base font-semibold">Create a Team</h3>
          <p className="mt-2 text-sm text-text-tertiary max-w-sm mx-auto">
            Invite team members to collaborate on your portfolio. Team members
            share access to portfolio data based on their role.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-2 max-w-xs mx-auto">
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

  return (
    <div className="space-y-6">
      {/* Org header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-border-default bg-bg-elevated">
            <Settings className="h-5 w-5 text-text-muted" />
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
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-text-tertiary">
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

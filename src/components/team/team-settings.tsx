"use client";

import * as React from "react";
import { Users, Plus, Loader2, Settings } from "lucide-react";
import { MemberList } from "./member-list";
import { PendingInvitations } from "./pending-invitations";
import { InviteMemberModal } from "./invite-member-modal";

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
          console.error("Failed to load members:", membersJson);
        }
        if (!invitationsRes.ok) {
          console.error("Failed to load invitations:", invitationsJson);
        }

        setMembers(membersJson.members ?? []);
        setInvitations(invitationsJson.invitations ?? []);
      }
    } catch (err) {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  // No org yet — show creation form
  if (!org) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <Users className="mx-auto h-10 w-10 text-white/30" />
          <h3 className="mt-4 text-base font-semibold">Create a Team</h3>
          <p className="mt-2 text-sm text-white/50 max-w-sm mx-auto">
            Invite team members to collaborate on your portfolio. Team members
            share access to portfolio data based on their role.
          </p>

          {error && (
            <div className="mt-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          <div className="mt-6 flex gap-2 max-w-xs mx-auto">
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="Team name"
              className="h-11 flex-1 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreateOrg();
              }}
            />
            <button
              type="button"
              onClick={handleCreateOrg}
              disabled={creating || !orgName.trim()}
              className="h-11 rounded-md bg-white px-5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
            >
              {creating ? "Creating..." : "Create"}
            </button>
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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 bg-white/5">
            <Settings className="h-5 w-5 text-white/40" />
          </div>
          <div>
            <h2 className="font-semibold">{org.name}</h2>
            <p className="text-xs text-white/40">
              {members.length} member{members.length !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setShowInviteModal(true)}
            className="inline-flex h-9 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90"
          >
            <Plus className="h-4 w-4" />
            Invite
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Members */}
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
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

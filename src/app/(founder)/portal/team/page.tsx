import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";
import { TeamSettings } from "@/components/team/team-settings";

export const metadata: Metadata = { title: "Team | Velvet" };
export const dynamic = "force-dynamic";

export default async function FounderTeamPage() {
  const user = await requireRole("founder");

  return (
    <div className="space-y-6">
      <div className="space-y-1" data-onboarding="team-title">
        <Breadcrumbs icon="layout-dashboard" items={[{ label: "Dashboard", href: "/portal" }, { label: "Team" }]} />
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Team</h1>
        <p className="text-sm text-text-tertiary">
          Manage your team members and their access to company data.
        </p>
      </div>
      <TeamSettings currentUserId={user.id} />
    </div>
  );
}

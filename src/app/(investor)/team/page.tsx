import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";
import { TeamSettings } from "@/components/team/team-settings";

export const metadata: Metadata = { title: "Team | Velvet" };
export const dynamic = "force-dynamic";

export default async function InvestorTeamPage() {
  const user = await requireRole("investor");

  return (
    <div className="space-y-8">
      <div>
        <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Team" }]} icon="building2" />
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight" data-onboarding="team-title">Team</h1>
      </div>
      <TeamSettings currentUserId={user.id} />
    </div>
  );
}

import { requireRole } from "@/lib/auth/require-role";
import { TeamSettings } from "@/components/team/team-settings";

export const dynamic = "force-dynamic";

export default async function InvestorTeamPage() {
  const user = await requireRole("investor");

  return (
    <div className="space-y-8">
      <h1 className="text-xl font-semibold tracking-tight" data-onboarding="team-title">Team</h1>
      <TeamSettings currentUserId={user.id} />
    </div>
  );
}

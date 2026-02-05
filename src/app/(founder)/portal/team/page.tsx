import { requireRole } from "@/lib/auth/require-role";
import { TeamSettings } from "@/components/team/team-settings";

export const dynamic = "force-dynamic";

export default async function FounderTeamPage() {
  const user = await requireRole("founder");

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Team</h1>
        <p className="text-sm text-white/60">
          Manage your team members and their access to company data.
        </p>
      </div>
      <TeamSettings currentUserId={user.id} />
    </div>
  );
}

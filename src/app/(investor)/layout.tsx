import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { InvestorLayoutClient } from "@/components/investor/investor-layout-client";
import { InvestorAppShell } from "@/components/investor/investor-app-shell";

export const dynamic = "force-dynamic";

export default async function InvestorLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get fresh user data with metadata
  const {
    data: { user: freshUser },
  } = await supabase.auth.getUser();

  // Fetch user's saved theme preference for per-user theme sync
  const { data: userData } = await supabase
    .from("users")
    .select("preferences")
    .eq("id", freshUser!.id)
    .single();
  const savedTheme = (userData?.preferences as Record<string, unknown> | null)?.theme as string | undefined;

  const onboardingStep = freshUser?.user_metadata?.onboarding_step ?? null;
  const onboardingComplete =
    freshUser?.user_metadata?.onboarding_complete ?? false;

  // Auto-start tour for new users who haven't completed it
  // and don't have a step set (first visit)
  const shouldAutoStart = onboardingStep === null && !onboardingComplete;
  const initialStep = shouldAutoStart ? 0 : onboardingStep;

  const userInfo = {
    fullName: freshUser?.user_metadata?.full_name ?? null,
    email: freshUser?.email ?? "",
  };

  return (
    <InvestorLayoutClient
      initialOnboardingStep={initialStep}
      isOnboardingComplete={onboardingComplete}
    >
      <InvestorAppShell
        title="Investor"
        initialTheme={savedTheme}
        nav={[
          {
            href: "/contacts",
            label: "Portfolio",
            icon: "briefcase",
            children: [
              { href: "/companies", label: "Companies", icon: "building2" },
              { href: "/contacts", label: "Contacts", icon: "users" },
              { href: "/metric-requests", label: "Metric Requests", icon: "send" },
              { href: "/tear-sheets", label: "Tear Sheets", icon: "file-spreadsheet" },
            ],
          },
          {
            href: "/reports",
            label: "Reports",
            icon: "bar-chart-3",
            divider: true,
          },
          { href: "/documents", label: "Documents", icon: "file-text" },
          {
            href: "/funds",
            label: "Funds",
            icon: "landmark",
            children: [
              { href: "/funds", label: "Overview", icon: "landmark" },
              { href: "/funds/lp-reports", label: "LP Reports", icon: "file-text" },
            ],
          },
        ]}
        profileLinks={[
          { href: "/historical-upload", label: "Import Data", icon: "upload" },
        ]}
        user={userInfo}
      >
        {children}
      </InvestorAppShell>
    </InvestorLayoutClient>
  );
}

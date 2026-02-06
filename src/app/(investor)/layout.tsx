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
        nav={[
          {
            href: "/portfolio",
            label: "Portfolio",
            icon: "briefcase",
            children: [
              { href: "/dashboard", label: "Companies", icon: "building2" },
              { href: "/portfolio", label: "Contacts", icon: "users" },
              { href: "/requests", label: "Requests", icon: "send" },
            ],
          },
          { href: "/reports", label: "Reports", icon: "bar-chart-3", divider: true },
          { href: "/documents", label: "Documents", icon: "file-text" },
          { href: "/lp-reports", label: "LP Reports", icon: "landmark" },
          { href: "/team", label: "Team", icon: "user-plus" },
          { href: "/query", label: "Ask AI", icon: "sparkles" },
        ]}
        user={userInfo}
      >
        {children}
      </InvestorAppShell>
    </InvestorLayoutClient>
  );
}

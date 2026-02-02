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
            children: [
              { href: "/dashboard", label: "Companies" },
              { href: "/portfolio", label: "Contacts" },
              { href: "/requests", label: "Requests" },
            ],
          },
          { href: "/reports", label: "Reports" },
          { href: "/documents", label: "Documents" },
        ]}
      >
        {children}
      </InvestorAppShell>
    </InvestorLayoutClient>
  );
}


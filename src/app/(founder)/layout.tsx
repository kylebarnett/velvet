import { type CompanyInfo } from "@/components/layouts/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MetricDefinitionsProvider } from "@/contexts/metric-definitions-context";
import { FounderLayoutClient } from "@/components/founder/founder-layout-client";
import { FounderAppShell } from "@/components/founder/founder-app-shell";

export const dynamic = "force-dynamic";

export default async function FounderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get fresh user data with metadata
  const {
    data: { user: freshUser },
  } = await supabase.auth.getUser();

  const onboardingStep = freshUser?.user_metadata?.founder_onboarding_step ?? null;
  const onboardingComplete =
    freshUser?.user_metadata?.founder_onboarding_complete ?? false;

  // Auto-start tour for new users who haven't completed it
  const shouldAutoStart = onboardingStep === null && !onboardingComplete;
  const initialStep = shouldAutoStart ? 0 : onboardingStep;

  // Fetch the founder's company
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, name, website, logo_url")
    .eq("founder_id", user.id)
    .single();

  let company: CompanyInfo | undefined;
  if (companyData) {
    company = {
      name: companyData.name,
      website: companyData.website,
      logoUrl: companyData.logo_url ?? null,
    };
  }

  // Count pending metric requests for badge — group by investor+period so
  // a single request with 3 metrics shows as "1", not "3"
  let pendingCount = 0;
  if (companyData) {
    const { data: pendingRequests } = await supabase
      .from("metric_requests")
      .select("investor_id, period_start, period_end")
      .eq("company_id", companyData.id)
      .eq("status", "pending");

    const uniqueKeys = new Set(
      (pendingRequests ?? []).map(
        (r) => `${r.investor_id}|${r.period_start}|${r.period_end}`,
      ),
    );
    pendingCount = uniqueKeys.size;
  }

  const userInfo = {
    fullName: freshUser?.user_metadata?.full_name ?? user.user_metadata?.full_name ?? null,
    email: user.email ?? "",
  };

  return (
    <MetricDefinitionsProvider>
      <FounderLayoutClient
        initialOnboardingStep={initialStep}
        isOnboardingComplete={onboardingComplete}
      >
        <FounderAppShell
          title="Founder"
          nav={[
            { href: "/portal", label: "Dashboard", icon: "layout-dashboard" },
            { href: "/portal/requests", label: "Metric Requests", icon: "inbox", badge: pendingCount },
            { href: "/portal/investors", label: "Investors", icon: "shield" },
            { href: "/portal/team", label: "Team", icon: "user-plus" },
          ]}
          company={company}
          user={userInfo}
        >
          {children}
        </FounderAppShell>
      </FounderLayoutClient>
    </MetricDefinitionsProvider>
  );
}

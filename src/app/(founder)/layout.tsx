import { AppShell, type CompanyInfo } from "@/components/layouts/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function FounderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Fetch the founder's company
  const { data: companyData } = await supabase
    .from("companies")
    .select("id, name, website")
    .eq("founder_id", user.id)
    .single();

  let company: CompanyInfo | undefined;
  if (companyData) {
    company = {
      name: companyData.name,
      website: companyData.website,
      logoUrl: null,
    };
  }

  // Count pending metric requests for badge
  let pendingCount = 0;
  if (companyData) {
    const { count } = await supabase
      .from("metric_requests")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyData.id)
      .eq("status", "pending");
    pendingCount = count ?? 0;
  }

  return (
    <AppShell
      title="Founder"
      nav={[
        { href: "/portal", label: "Dashboard" },
        { href: "/portal/requests", label: "Requests", badge: pendingCount },
        { href: "/portal/documents", label: "Documents" },
        { href: "/portal/tear-sheets", label: "Tear Sheets" },
        { href: "/portal/investors", label: "Investors" },
      ]}
      company={company}
    >
      {children}
    </AppShell>
  );
}

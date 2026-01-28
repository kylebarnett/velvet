import { AppShell, type CompanyInfo } from "@/components/layouts/app-shell";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLogoUrl } from "@/lib/utils/logo";

export const dynamic = "force-dynamic";

export default async function FounderLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Fetch the founder's company
  const { data: companyData } = await supabase
    .from("companies")
    .select("name, website")
    .eq("founder_id", user.id)
    .single();

  let company: CompanyInfo | undefined;
  if (companyData) {
    company = {
      name: companyData.name,
      website: companyData.website,
      logoUrl: getLogoUrl(companyData.website),
    };
  }

  return (
    <AppShell
      title="Founder"
      nav={[
        { href: "/portal", label: "Portal" },
        { href: "/portal/requests", label: "Requests" },
        { href: "/portal/metrics", label: "Metrics" },
        { href: "/portal/investors", label: "Investors" },
        { href: "/portal/documents", label: "Documents" },
      ]}
      company={company}
    >
      {children}
    </AppShell>
  );
}


import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { LPReportsClient } from "@/components/lp/lp-reports-client";

export const dynamic = "force-dynamic";

export default async function LPReportsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Fetch funds
  const { data: funds } = await supabase
    .from("funds")
    .select("*")
    .eq("investor_id", user.id)
    .order("vintage_year", { ascending: false });

  // Fetch portfolio companies for investment dropdown
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id, companies(id, name)")
    .eq("investor_id", user.id);

  const companies = (relationships ?? [])
    .map((r) => {
      const companyRaw = r.companies;
      const company = Array.isArray(companyRaw)
        ? (companyRaw[0] as { id: string; name: string } | undefined)
        : (companyRaw as { id: string; name: string } | null);
      return company ?? null;
    })
    .filter((c): c is { id: string; name: string } => c !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  return <LPReportsClient funds={funds ?? []} companies={companies} />;
}

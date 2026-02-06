import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RequestsTabs } from "@/components/investor/requests-tabs";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get unique companies for filter dropdown
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("companies (id, name)")
    .eq("investor_id", user.id);

  const companies = (relationships ?? [])
    .map((r) => {
      const companyRaw = r.companies;
      const company = (Array.isArray(companyRaw) ? companyRaw[0] : companyRaw) as { id: string; name: string } | null;
      return company;
    })
    .filter((c): c is { id: string; name: string } => c !== null);

  return (
    <Suspense>
      <RequestsTabs
        companies={companies}
      />
    </Suspense>
  );
}

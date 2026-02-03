import { Suspense } from "react";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { RequestsTabs } from "@/components/investor/requests-tabs";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Fetch all metric requests with company and definition info
  const { data: requests } = await supabase
    .from("metric_requests")
    .select(`
      id,
      period_start,
      period_end,
      status,
      due_date,
      created_at,
      company_id,
      companies (
        id,
        name
      ),
      metric_definitions (
        name,
        period_type
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

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
        requests={requests ?? []}
        companies={companies}
      />
    </Suspense>
  );
}

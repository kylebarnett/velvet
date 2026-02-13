import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ReportsPageClient } from "@/components/reports/reports-page-client";
import type { SavedReport } from "@/components/reports/reports-context";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("portfolio_reports")
    .select("*")
    .eq("investor_id", user.id)
    .order("updated_at", { ascending: false });

  const reports: SavedReport[] = (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    report_type: r.report_type,
    is_default: r.is_default,
    filters: r.filters,
    company_ids: r.company_ids,
    normalize: r.normalize,
    config: r.config,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));

  return <ReportsPageClient initialReports={reports} />;
}

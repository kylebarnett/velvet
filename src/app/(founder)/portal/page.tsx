import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FounderPortalTabs } from "@/components/founder/founder-portal-tabs";

export const dynamic = "force-dynamic";

export default async function FounderDashboardPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No company linked to your account yet.</p>
          <p className="mt-2 text-sm text-white/40">
            Ask an investor to invite you to get started.
          </p>
        </div>
      </div>
    );
  }

  // Fetch metric values
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select(
      "id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at, source, ai_confidence",
    )
    .eq("company_id", company.id)
    .order("period_start", { ascending: false });

  // Fetch saved dashboard views
  const { data: views } = await supabase
    .from("dashboard_views")
    .select("id, name, is_default, layout")
    .eq("founder_id", user.id)
    .eq("company_id", company.id)
    .order("created_at", { ascending: true });

  // Fetch dashboard templates
  const { data: templates } = await supabase
    .from("dashboard_templates")
    .select("id, name, description, target_industry, layout, is_system")
    .order("name", { ascending: true });

  // Fetch document count
  const { count: documentCount } = await supabase
    .from("documents")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  // Fetch tear sheet count
  const { count: tearSheetCount } = await supabase
    .from("tear_sheets")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  return (
    <FounderPortalTabs
      companyId={company.id}
      companyName={company.name}
      companyIndustry={company.industry}
      metrics={metricValues ?? []}
      views={views ?? []}
      templates={templates ?? []}
      documentCount={documentCount ?? 0}
      tearSheetCount={tearSheetCount ?? 0}
    />
  );
}

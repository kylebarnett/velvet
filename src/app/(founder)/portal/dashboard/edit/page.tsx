import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardBuilder } from "@/components/dashboard/dashboard-builder";

export const dynamic = "force-dynamic";

export default async function FounderDashboardEditPage() {
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
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
        No company linked to your account.
      </div>
    );
  }

  // Get metric values (names for widget config + full values for live preview)
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select("id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at")
    .eq("company_id", company.id)
    .order("period_start", { ascending: false });

  const metrics = (metricValues ?? []).map((m) => ({
    ...m,
    period_type: m.period_type as "monthly" | "quarterly" | "yearly",
  }));

  const availableMetrics = Array.from(
    new Set(metrics.map((m) => m.metric_name))
  ).sort();

  // Get dashboard views
  const { data: views } = await supabase
    .from("dashboard_views")
    .select("id, name, is_default, layout")
    .eq("founder_id", user.id)
    .eq("company_id", company.id)
    .order("created_at", { ascending: true });

  // Get dashboard templates
  const { data: templates } = await supabase
    .from("dashboard_templates")
    .select("id, name, description, target_industry, layout, is_system")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          Edit Dashboard
        </h1>
      </div>

      <DashboardBuilder
        companyId={company.id}
        companyName={company.name}
        companyIndustry={company.industry}
        availableMetrics={availableMetrics}
        metrics={metrics}
        views={views ?? []}
        templates={templates ?? []}
        apiBasePath="/api/founder/dashboard-views"
        redirectPath="/portal"
      />
    </div>
  );
}

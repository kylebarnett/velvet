import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";

export const metadata: Metadata = { title: "Edit Dashboard | Velvet" };
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardBuilder } from "@/components/dashboard/dashboard-builder";

export const dynamic = "force-dynamic";

export default async function DashboardEditPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { companyId } = await params;

  // Verify relationship
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id, approval_status")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return (
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
        Company not in your portfolio.
      </div>
    );
  }

  const isApproved =
    relationship.approval_status === "auto_approved" ||
    relationship.approval_status === "approved";

  if (!isApproved) {
    return (
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
        Your access is pending approval. You can edit the dashboard once the founder approves your access.
      </div>
    );
  }

  // Get company info
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry")
    .eq("id", companyId)
    .single();

  if (!company) {
    return (
      <div className="rounded-xl border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] p-4 text-sm text-[var(--status-error-text)]">
        Company not found.
      </div>
    );
  }

  // Get metric values (names for widget config + full values for live preview)
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select("id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at")
    .eq("company_id", companyId)
    .order("period_start", { ascending: false });

  const metrics = (metricValues ?? []).map((m) => ({
    ...m,
    period_type: m.period_type as "monthly" | "quarterly" | "yearly",
  }));

  const availableMetrics = Array.from(
    new Set(metrics.map((m) => m.metric_name))
  ).sort();

  // Get dashboard views for this company
  const { data: views } = await supabase
    .from("dashboard_views")
    .select("id, name, is_default, layout")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });

  // Get dashboard templates
  const { data: templates } = await supabase
    .from("dashboard_templates")
    .select("id, name, description, target_industry, layout, is_system")
    .order("name", { ascending: true });

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Edit Dashboard" }]} icon="building2" />
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Edit Dashboard - {company.name}
        </h1>
      </div>

      <DashboardBuilder
        companyId={companyId}
        companyName={company.name}
        companyIndustry={company.industry}
        availableMetrics={availableMetrics}
        metrics={metrics}
        views={views ?? []}
        templates={templates ?? []}
        apiBasePath="/api/investors/dashboard-views"
        redirectPath={`/companies/${companyId}`}
      />
    </div>
  );
}

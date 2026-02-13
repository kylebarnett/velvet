import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardBuilderClient } from "./dashboard-builder-client";

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
      <div className="space-y-4">
        <Link
          href={`/dashboard/${companyId}`}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
        <div className="rounded-xl border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] p-4 text-sm text-[var(--status-warning-text)]">
          Your access is pending approval. You can edit the dashboard once the founder approves your access.
        </div>
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

  // Get metric values to know available metrics
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select("metric_name")
    .eq("company_id", companyId);

  const availableMetrics = Array.from(
    new Set((metricValues ?? []).map((m) => m.metric_name))
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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: "Edit Dashboard" }]} />
          <Link
            href={`/dashboard/${companyId}`}
            className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Edit Dashboard - {company.name}
          </h1>
        </div>
      </div>

      <DashboardBuilderClient
        companyId={companyId}
        companyName={company.name}
        companyIndustry={company.industry}
        availableMetrics={availableMetrics}
        views={views ?? []}
        templates={templates ?? []}
      />
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FounderDashboardBuilder } from "@/components/founder/founder-dashboard-builder";

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
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        No company linked to your account.
      </div>
    );
  }

  // Get available metrics
  const { data: metricValues } = await supabase
    .from("company_metric_values")
    .select("metric_name")
    .eq("company_id", company.id);

  const availableMetrics = Array.from(
    new Set((metricValues ?? []).map((m) => m.metric_name)),
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
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/portal"
            className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Cancel
          </Link>
          <h1 className="text-xl font-semibold tracking-tight">
            Edit Dashboard
          </h1>
        </div>
      </div>

      <FounderDashboardBuilder
        companyId={company.id}
        companyName={company.name}
        companyIndustry={company.industry}
        availableMetrics={availableMetrics}
        views={views ?? []}
        templates={templates ?? []}
      />
    </div>
  );
}

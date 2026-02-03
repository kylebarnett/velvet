import Link from "next/link";
import { Settings } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { FounderDashboardClient } from "@/components/founder/founder-dashboard-client";

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
      "id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at",
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/60">
            Visualize your company metrics and track performance.
          </p>
        </div>
        <Link
          href="/portal/dashboard/edit"
          className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 sm:py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
        >
          <Settings className="h-3.5 w-3.5" />
          Edit Dashboard
        </Link>
      </div>

      <FounderDashboardClient
        companyId={company.id}
        companyName={company.name}
        companyIndustry={company.industry}
        metrics={metricValues ?? []}
        views={views ?? []}
        templates={templates ?? []}
      />
    </div>
  );
}

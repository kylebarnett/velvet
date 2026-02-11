import { Building2 } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { GettingStartedChecklist } from "@/components/ui/getting-started-checklist";
import { FounderPortalTabs } from "@/components/founder/founder-portal-tabs";

export const dynamic = "force-dynamic";

export default async function FounderDashboardPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry, website, stage, business_model")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <EmptyState
          icon={Building2}
          title="No company linked to your account yet"
          description="Your company will appear here once an investor invites you. If you signed up independently, ask your investor to add your email to their portfolio."
        />
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

  // Fetch investor count for checklist
  const { count: investorCount } = await supabase
    .from("investor_company_relationships")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  const hasProfile = !!(company.industry || company.stage);
  const hasMetrics = (metricValues ?? []).length > 0;

  return (
    <div className="space-y-6">
      <GettingStartedChecklist
        role="founder"
        items={[
          {
            id: "profile",
            label: "Complete your company profile",
            description: "Add your industry, stage, and website so investors can find you",
            href: "/portal/company",
            completed: hasProfile,
          },
          {
            id: "investors",
            label: "Review investor access",
            description: "Approve or deny investors who want to view your data",
            href: "/portal/investors",
            completed: (investorCount ?? 0) > 0,
          },
          {
            id: "metrics",
            label: "Submit your first metrics",
            description: "Enter your key metrics so approved investors can track progress",
            href: "/portal/requests",
            completed: hasMetrics,
          },
          {
            id: "historical_upload",
            label: "Import historical metrics",
            description: "Bulk import past metrics from Excel or CSV files",
            href: "/portal/historical-upload",
            completed: false,
          },
          {
            id: "documents",
            label: "Upload documents",
            description: "Share pitch decks, financials, and other materials with investors",
            href: "/portal",
            completed: (documentCount ?? 0) > 0,
          },
        ]}
      />
    <FounderPortalTabs
      companyId={company.id}
      companyName={company.name}
      companyIndustry={company.industry}
      companyWebsite={company.website}
      companyStage={company.stage}
      companyBusinessModel={company.business_model}
      metrics={metricValues ?? []}
      views={views ?? []}
      templates={templates ?? []}
      documentCount={documentCount ?? 0}
      tearSheetCount={tearSheetCount ?? 0}
    />
    </div>
  );
}

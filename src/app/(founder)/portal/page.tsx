import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/empty-state";
import { GettingStartedChecklist } from "@/components/ui/getting-started-checklist";
import { FounderPortalTabs } from "@/components/founder/founder-portal-tabs";

export const dynamic = "force-dynamic";

function getCurrentQuarterLabel(): string {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${quarter} ${now.getFullYear()}`;
}

function getCurrentQuarterRange(): { start: string; end: string } {
  const now = new Date();
  const quarter = Math.ceil((now.getMonth() + 1) / 3);
  const startMonth = (quarter - 1) * 3;
  const start = new Date(now.getFullYear(), startMonth, 1);
  const end = new Date(now.getFullYear(), startMonth + 3, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

export default async function FounderDashboardPage() {
  const user = await requireRole("founder");
  const supabase = await createSupabaseServerClient();

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, industry, website, stage, business_model, logo_url")
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <EmptyState
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

  // Fetch investor count for checklist
  const { count: investorCount } = await supabase
    .from("investor_company_relationships")
    .select("*", { count: "exact", head: true })
    .eq("company_id", company.id);

  const hasProfile = !!(company.industry || company.stage);
  const hasMetrics = (metricValues ?? []).length > 0;

  // Build data completeness info for the adaptive checklist
  const quarterRange = getCurrentQuarterRange();
  const currentQuarterLabel = getCurrentQuarterLabel();

  // Get pending metric requests for current quarter
  const { data: pendingRequests } = await supabase
    .from("metric_requests")
    .select("id, metric_name, due_date, status")
    .eq("company_id", company.id)
    .eq("status", "pending");

  // Count submitted metrics for current quarter
  const currentQuarterMetrics = (metricValues ?? []).filter(
    (m) => m.period_start >= quarterRange.start && m.period_start <= quarterRange.end
  );
  const submittedMetricNames = new Set(currentQuarterMetrics.map((m) => m.metric_name));

  // All unique requested metric names
  const requestedMetricNames = [...new Set((pendingRequests ?? []).map((r) => r.metric_name))];
  const totalRequested = new Set([...requestedMetricNames, ...submittedMetricNames]).size;
  const submittedCount = submittedMetricNames.size;

  // Overdue requests (due_date < today)
  const today = new Date().toISOString().split("T")[0];
  const overdueCount = (pendingRequests ?? []).filter(
    (r) => r.due_date && r.due_date < today
  ).length;

  // Days until next due date
  const upcomingDueDates = (pendingRequests ?? [])
    .filter((r) => r.due_date && r.due_date >= today)
    .map((r) => r.due_date!)
    .sort();
  const nextDueDate = upcomingDueDates[0] ?? null;
  const daysTillDue = nextDueDate
    ? Math.ceil((new Date(nextDueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Last submission date
  const lastSubmissionDate = currentQuarterMetrics.length > 0
    ? currentQuarterMetrics
        .map((m) => m.submitted_at ?? m.updated_at)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null
    : null;

  // Missing metrics (pending but not yet submitted for current quarter)
  const missingMetrics = requestedMetricNames
    .filter((name) => !submittedMetricNames.has(name))
    .map((name) => ({ name, href: "/portal/requests" }));

  const dataCompleteness = totalRequested > 0 ? {
    currentQuarter: currentQuarterLabel,
    submittedCount,
    totalRequested,
    overdueCount,
    daysTillDue,
    lastSubmissionDate,
    missingMetrics,
  } : undefined;

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
        dataCompleteness={dataCompleteness}
      />
    <FounderPortalTabs
      companyId={company.id}
      companyName={company.name}
      companyIndustry={company.industry}
      companyWebsite={company.website}
      companyStage={company.stage}
      companyBusinessModel={company.business_model}
      companyLogoUrl={company.logo_url}
      metrics={metricValues ?? []}
      views={views ?? []}
      templates={templates ?? []}
    />
    </div>
  );
}

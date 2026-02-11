import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PortfolioCompletionCard } from "@/components/investor/portfolio-completion-card";
import { GettingStartedChecklist } from "@/components/ui/getting-started-checklist";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

type MetricValue = {
  metric_name: string;
  value: unknown;
  period_start: string;
  company_id: string;
  submitted_at?: string;
};

// Priority metrics to show as snapshot (first match wins)
const PRIORITY_METRICS = [
  "mrr",
  "arr",
  "revenue",
  "net revenue",
  "gmv",
  "total transaction volume",
  "monthly active users",
  "monthly active learners",
  "monthly active patients",
];

function getNumericValue(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number") return value;
  if (typeof value === "object" && value !== null) {
    const v = (value as Record<string, unknown>).value;
    if (typeof v === "number") return v;
    if (typeof v === "string") return parseFloat(v) || null;
  }
  if (typeof value === "string") return parseFloat(value) || null;
  return null;
}

export default async function InvestorDashboardPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get portfolio companies with tile metric preferences
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      approval_status,
      logo_url,
      tile_primary_metric,
      tile_secondary_metric,
      companies (
        id,
        name,
        website,
        founder_id,
        stage,
        industry
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  type CompanyData = {
    id: string;
    name: string;
    website: string | null;
    founder_id: string | null;
    stage: string | null;
    industry: string | null;
  };
  const companies = (relationships ?? []).map((r) => {
    // Handle both single object and array from Supabase join
    const companyRaw = r.companies;
    const company: CompanyData | null = Array.isArray(companyRaw)
      ? (companyRaw[0] as CompanyData | undefined) ?? null
      : (companyRaw as CompanyData | null);
    return {
      id: company?.id ?? "",
      name: company?.name ?? "",
      website: company?.website ?? null,
      founder_id: company?.founder_id ?? null,
      stage: company?.stage ?? null,
      industry: company?.industry ?? null,
      approvalStatus: r.approval_status,
      logoUrl: r.logo_url,
      tilePrimaryMetric: r.tile_primary_metric,
      tileSecondaryMetric: r.tile_secondary_metric,
    };
  }).filter((c) => c.id).sort((a, b) => a.name.localeCompare(b.name));

  // Get company IDs that are approved
  const approvedCompanyIds = companies
    .filter((c) => ["auto_approved", "approved"].includes(c.approvalStatus))
    .map((c) => c.id);

  // Build a map of configured metrics per company
  const configuredMetrics = new Map<string, { primary: string | null; secondary: string | null }>();
  for (const c of companies) {
    configuredMetrics.set(c.id, {
      primary: c.tilePrimaryMetric,
      secondary: c.tileSecondaryMetric,
    });
  }

  // Fetch latest metrics for approved companies
  const latestMetrics: Record<
    string,
    { name: string; value: number | null; previousValue: number | null; percentChange: number | null }
  > = {};
  const secondaryMetrics: Record<
    string,
    { name: string; value: number | null; previousValue: number | null; percentChange: number | null }
  > = {};
  // Track most recent submission date per company for freshness indicator
  const lastSubmittedAt: Record<string, string> = {};

  if (approvedCompanyIds.length > 0) {
    // Get recent metric values
    const { data: metricValues } = await supabase
      .from("company_metric_values")
      .select("company_id, metric_name, value, period_start, submitted_at")
      .in("company_id", approvedCompanyIds)
      .order("period_start", { ascending: false });

    if (metricValues) {
      // Group by company, find best metric per company
      const byCompany = new Map<string, MetricValue[]>();
      for (const mv of metricValues as MetricValue[]) {
        if (!byCompany.has(mv.company_id)) {
          byCompany.set(mv.company_id, []);
        }
        byCompany.get(mv.company_id)!.push(mv);

        // Track most recent submitted_at per company
        if (mv.submitted_at) {
          if (!lastSubmittedAt[mv.company_id] || mv.submitted_at > lastSubmittedAt[mv.company_id]) {
            lastSubmittedAt[mv.company_id] = mv.submitted_at;
          }
        }
      }

      // Helper to find metric by name and calculate values
      function findMetricByName(values: MetricValue[], metricName: string): {
        name: string;
        value: number | null;
        previousValue: number | null;
        percentChange: number | null;
      } | null {
        const matches = values.filter(
          (v) => v.metric_name.toLowerCase() === metricName.toLowerCase()
        );
        if (matches.length === 0) return null;

        const currentValue = getNumericValue(matches[0].value);
        const prevValue = matches.length > 1 ? getNumericValue(matches[1].value) : null;
        const percentChange =
          currentValue != null && prevValue != null && prevValue !== 0
            ? ((currentValue - prevValue) / Math.abs(prevValue)) * 100
            : null;

        return {
          name: matches[0].metric_name,
          value: currentValue,
          previousValue: prevValue,
          percentChange,
        };
      }

      for (const [companyId, values] of byCompany) {
        // Sort by period_start desc
        values.sort(
          (a, b) =>
            new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
        );

        const config = configuredMetrics.get(companyId);

        // If configured primary metric exists, use it
        if (config?.primary) {
          const configuredPrimary = findMetricByName(values, config.primary);
          if (configuredPrimary) {
            latestMetrics[companyId] = configuredPrimary;
          }
          // If secondary is configured, find it too
          if (config.secondary) {
            const configuredSecondary = findMetricByName(values, config.secondary);
            if (configuredSecondary) {
              secondaryMetrics[companyId] = configuredSecondary;
            }
          }
          // Skip fallback if configured (even if no data found - will show "No metrics")
          if (configuredPrimary) continue;
        }

        // Fallback: Find priority metric (existing behavior)
        let selectedMetric: MetricValue | null = null;
        let previousMetric: MetricValue | null = null;

        for (const priorityName of PRIORITY_METRICS) {
          const matches = values.filter(
            (v) => v.metric_name.toLowerCase() === priorityName
          );
          if (matches.length > 0) {
            selectedMetric = matches[0];
            if (matches.length > 1) {
              previousMetric = matches[1];
            }
            break;
          }
        }

        // Fallback to most recent metric if no priority match
        if (!selectedMetric && values.length > 0) {
          selectedMetric = values[0];
          const sameMetricValues = values.filter(
            (v) => v.metric_name === values[0].metric_name
          );
          if (sameMetricValues.length > 1) {
            previousMetric = sameMetricValues[1];
          }
        }

        if (selectedMetric) {
          const currentValue = getNumericValue(selectedMetric.value);
          const prevValue = previousMetric
            ? getNumericValue(previousMetric.value)
            : null;
          const percentChange =
            currentValue != null && prevValue != null && prevValue !== 0
              ? ((currentValue - prevValue) / Math.abs(prevValue)) * 100
              : null;

          latestMetrics[companyId] = {
            name: selectedMetric.metric_name,
            value: currentValue,
            previousValue: prevValue,
            percentChange,
          };
        }
      }
    }
  }

  // Count distinct companies with pending requests (awaiting submission)
  const { data: pendingCompanyRows } = await supabase
    .from("metric_requests")
    .select("company_id")
    .eq("investor_id", user.id)
    .eq("status", "pending");

  const awaitingCompanyCount = pendingCompanyRows
    ? new Set(pendingCompanyRows.map((r) => r.company_id)).size
    : 0;

  // Count distinct companies with submissions this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { data: submittedCompanyRows } = await supabase
    .from("metric_requests")
    .select("company_id")
    .eq("investor_id", user.id)
    .eq("status", "submitted")
    .gte("updated_at", weekAgo.toISOString());

  const submittedThisWeekCount = submittedCompanyRows
    ? new Set(submittedCompanyRows.map((r) => r.company_id)).size
    : 0;

  // Portfolio completion: current quarter requests grouped by company
  const currentQuarterStart = new Date();
  const currentQuarter = Math.floor(currentQuarterStart.getMonth() / 3) + 1;
  const currentYear = currentQuarterStart.getFullYear();
  currentQuarterStart.setMonth(Math.floor(currentQuarterStart.getMonth() / 3) * 3, 1);
  currentQuarterStart.setHours(0, 0, 0, 0);

  const { data: quarterRequests } = await supabase
    .from("metric_requests")
    .select(
      "id, status, company_id, due_date, period_start, period_end, companies!inner(id, name), metric_definitions!inner(name)"
    )
    .eq("investor_id", user.id)
    .gte("period_start", currentQuarterStart.toISOString());

  type MetricDetail = {
    id: string;
    metricName: string;
    status: string;
    dueDate: string | null;
    periodStart: string;
    periodEnd: string;
  };

  type CompanyCompletion = {
    id: string;
    name: string;
    total: number;
    submitted: number;
    metrics: MetricDetail[];
  };

  const companyMap = new Map<string, CompanyCompletion>();
  let completionTotal = 0;
  let completionSubmitted = 0;

  if (quarterRequests) {
    for (const req of quarterRequests) {
      const companyRaw = req.companies;
      const company = Array.isArray(companyRaw)
        ? (companyRaw[0] as { id: string; name: string } | undefined)
        : (companyRaw as { id: string; name: string } | null);
      if (!company) continue;

      const defRaw = req.metric_definitions;
      const def = Array.isArray(defRaw)
        ? (defRaw[0] as { name: string } | undefined)
        : (defRaw as { name: string } | null);

      const detail: MetricDetail = {
        id: req.id,
        metricName: def?.name ?? "Unknown metric",
        status: req.status,
        dueDate: req.due_date,
        periodStart: req.period_start,
        periodEnd: req.period_end,
      };

      completionTotal++;
      if (req.status === "submitted") completionSubmitted++;

      const existing = companyMap.get(company.id);
      if (existing) {
        existing.total++;
        if (req.status === "submitted") existing.submitted++;
        existing.metrics.push(detail);
      } else {
        companyMap.set(company.id, {
          id: company.id,
          name: company.name,
          total: 1,
          submitted: req.status === "submitted" ? 1 : 0,
          metrics: [detail],
        });
      }
    }
  }

  // Sort metrics within each company: pending first (by due date asc), then submitted
  for (const company of companyMap.values()) {
    company.metrics.sort((a, b) => {
      if (a.status !== b.status) {
        return a.status === "submitted" ? 1 : -1;
      }
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate);
      if (a.dueDate) return -1;
      return 1;
    });
  }

  // Sort worst completion first (ascending by %)
  const completionCompanies = Array.from(companyMap.values()).sort((a, b) => {
    const pctA = a.total > 0 ? a.submitted / a.total : 0;
    const pctB = b.total > 0 ? b.submitted / b.total : 0;
    return pctA - pctB;
  });

  const quarterLabel = `Q${currentQuarter} ${currentYear}`;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight" data-onboarding="dashboard-title">Dashboard</h1>
        <p className="text-sm text-text-tertiary">
          Portfolio overview and recent metric activity.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Portfolio companies", subtitle: "Total companies you're tracking", value: String(companies.length), href: "/portfolio", icon: Building2, gradient: "kpi-gradient-blue" },
          { label: "Awaiting submission", subtitle: "Companies with pending metric requests", value: String(awaitingCompanyCount), href: "/campaigns", icon: Building2, gradient: "kpi-gradient-amber" },
          { label: "Submitted this week", subtitle: "Companies that submitted metrics in the last 7 days", value: String(submittedThisWeekCount), href: "/campaigns", icon: CheckCircle2, gradient: "kpi-gradient-emerald" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card-hover-lift group rounded-xl border border-border-subtle ${card.gradient} p-5 hover:border-border-default`}
          >
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wider text-text-muted group-hover:text-text-muted">{card.label}</div>
              <card.icon className="h-4 w-4 text-text-faint" />
            </div>
            <div className="mt-3 text-3xl font-semibold tracking-tight">{card.value}</div>
            <div className="mt-1 text-[11px] text-text-faint">{card.subtitle}</div>
          </Link>
        ))}
      </div>

      {/* Getting Started Checklist */}
      <GettingStartedChecklist
        role="investor"
        items={[
          {
            id: "import",
            label: "Import portfolio companies",
            description: "Add companies via CSV or manually to start tracking",
            href: "/portfolio/import",
            completed: companies.length > 0,
          },
          {
            id: "founder-connected",
            label: "Connect with a founder",
            description: "Wait for a founder to join and approve your access",
            href: "/dashboard",
            completed: companies.some((c) => c.founder_id !== null),
          },
          {
            id: "request",
            label: "Send your first metric request",
            description: "Ask portfolio companies to submit their metrics",
            href: "/campaigns/new",
            completed: awaitingCompanyCount > 0 || submittedThisWeekCount > 0 || completionTotal > 0,
          },
          {
            id: "historical_upload",
            label: "Import historical data",
            description: "Bulk import past metrics from Excel or CSV files",
            href: "/historical-upload",
            completed: false,
          },
          {
            id: "reports",
            label: "View portfolio reports",
            description: "Explore summary analytics, comparisons, and benchmarks",
            href: "/reports",
            completed: submittedThisWeekCount > 0,
          },
        ]}
      />

      {/* Portfolio Completion */}
      {completionTotal > 0 && (
        <PortfolioCompletionCard
          companies={completionCompanies}
          totalRequests={completionTotal}
          submittedRequests={completionSubmitted}
          quarterLabel={quarterLabel}
        />
      )}

      {companies.length === 0 ? (
        <div className="rounded-xl border border-border-default card-surface p-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
            <Building2 className="h-6 w-6 text-text-muted" />
          </div>
          <h3 className="text-sm font-medium text-text-primary">No companies in your portfolio yet</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-tertiary">
            Import your portfolio companies to start collecting metrics. Once imported, invite founders to connect and begin submitting data.
          </p>
          <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
            <Link
              href="/portfolio/import"
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            >
              Import contacts
            </Link>
            <Link
              href="/historical-upload"
              className="text-sm text-text-tertiary hover:text-text-secondary underline underline-offset-2"
            >
              Or import historical metrics
            </Link>
          </div>
          <div className="mx-auto mt-6 max-w-sm rounded-lg bg-bg-elevated/50 p-4">
            <p className="text-xs font-medium text-text-secondary mb-2">How it works</p>
            <ol className="space-y-1.5 text-left text-xs text-text-tertiary">
              <li className="flex gap-2"><span className="shrink-0 font-medium text-text-secondary">1.</span> Import your portfolio companies via CSV or add them manually</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-text-secondary">2.</span> Founders receive an invitation to join and connect their company</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-text-secondary">3.</span> Send metric requests to collect data on the cadence you choose</li>
              <li className="flex gap-2"><span className="shrink-0 font-medium text-text-secondary">4.</span> View reports and track performance across your portfolio</li>
            </ol>
          </div>
        </div>
      ) : (
        <DashboardContent companies={companies} latestMetrics={latestMetrics} secondaryMetrics={secondaryMetrics} lastSubmittedAt={lastSubmittedAt} />
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { Building2, CheckCircle2 } from "lucide-react";

export const metadata: Metadata = { title: "Portfolio | Velvet" };

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeRollups } from "@/lib/metrics/rollup";
import { GettingStartedChecklist } from "@/components/ui/getting-started-checklist";
import { AddCompanyFlow } from "@/components/investor/add-company-flow";
import { getNumericValue } from "@/lib/metrics/numeric-value";
import { DashboardContent } from "./dashboard-content";
import { DashboardTabs } from "./dashboard-tabs";

export const dynamic = "force-dynamic";

type MetricValue = {
  metric_name: string;
  value: unknown;
  period_start: string;
  period_type: string;
  company_id: string;
  submitted_at?: string;
};

function formatPeriodLabel(periodStart: string, periodType: string): string {
  const d = new Date(periodStart);
  const month = d.getUTCMonth(); // 0-indexed
  const year = d.getUTCFullYear();

  if (periodType === "quarterly") {
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
  }
  if (periodType === "annual") {
    return `${year}`;
  }
  // monthly
  const monthName = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${monthName} ${year}`;
}

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
      is_hidden,
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
      isHidden: r.is_hidden ?? false,
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
    { name: string; value: number | null; previousValue: number | null; percentChange: number | null; periodLabel: string | null }
  > = {};
  const secondaryMetrics: Record<
    string,
    { name: string; value: number | null; previousValue: number | null; percentChange: number | null; periodLabel: string | null }
  > = {};
  // Track most recent submission date per company for freshness indicator
  const lastSubmittedAt: Record<string, string> = {};

  if (approvedCompanyIds.length > 0) {
    // Get recent metric values (include period_type to prefer quarterly data)
    // Safety cap: ~100 companies × 20 metrics × 2 values = 4000 max needed
    const { data: metricValues } = await supabase
      .from("company_metric_values")
      .select("company_id, metric_name, value, period_start, period_type, submitted_at")
      .in("company_id", approvedCompanyIds)
      .order("period_start", { ascending: false })
      .limit(5000);

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

      // Helper: build a snapshot from a metric name within a set of values.
      // Prefers quarterly data, falls back to any period type.
      function findMetricByName(values: MetricValue[], metricName: string): {
        name: string;
        value: number | null;
        previousValue: number | null;
        percentChange: number | null;
        periodLabel: string | null;
      } | null {
        const allMatches = values.filter(
          (v) => v.metric_name.toLowerCase() === metricName.toLowerCase()
        );
        if (allMatches.length === 0) return null;

        // Prefer quarterly values; fall back to all if none exist
        const quarterlyMatches = allMatches.filter((v) => v.period_type === "quarterly");
        const matches = quarterlyMatches.length > 0 ? quarterlyMatches : allMatches;

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
          periodLabel: matches[0].period_start
            ? formatPeriodLabel(matches[0].period_start, matches[0].period_type)
            : null,
        };
      }

      // Helper: find the best metric from a list of values using priority order.
      // Prefers quarterly data, falls back to any period type.
      function findBestMetric(values: MetricValue[]): {
        current: MetricValue;
        previous: MetricValue | null;
      } | null {
        // Try quarterly values first, fall back to all
        const quarterlyValues = values.filter((v) => v.period_type === "quarterly");
        const pool = quarterlyValues.length > 0 ? quarterlyValues : values;

        // Try priority metrics first
        for (const priorityName of PRIORITY_METRICS) {
          const matches = pool.filter(
            (v) => v.metric_name.toLowerCase() === priorityName
          );
          if (matches.length > 0) {
            return { current: matches[0], previous: matches[1] ?? null };
          }
        }

        // Fall back to most recent metric in the pool
        if (pool.length > 0) {
          const sameMetricValues = pool.filter(
            (v) => v.metric_name === pool[0].metric_name
          );
          return {
            current: sameMetricValues[0],
            previous: sameMetricValues[1] ?? null,
          };
        }

        return null;
      }

      // Compute quarterly rollups from monthly data for each company
      for (const [companyId, values] of byCompany) {
        const rollups = computeRollups(values.map((v) => ({
          metric_name: v.metric_name,
          period_type: v.period_type,
          period_start: v.period_start,
          period_end: "", // not needed for quarterly rollup computation
          value: v.value,
        })), "quarterly");

        for (const r of rollups) {
          values.push({
            metric_name: r.metric_name,
            value: r.value,
            period_start: r.period_start,
            period_type: "quarterly",
            company_id: companyId,
          });
        }
      }

      for (const [companyId, values] of byCompany) {
        // Sort by period_start desc (already sorted from query, but ensure)
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
          if (config.secondary) {
            const configuredSecondary = findMetricByName(values, config.secondary);
            if (configuredSecondary) {
              secondaryMetrics[companyId] = configuredSecondary;
            }
          }
          if (configuredPrimary) continue;
        }

        // Fallback: find best metric (prefers quarterly)
        const best = findBestMetric(values);

        if (best) {
          const currentValue = getNumericValue(best.current.value);
          const prevValue = best.previous
            ? getNumericValue(best.previous.value)
            : null;
          const percentChange =
            currentValue != null && prevValue != null && prevValue !== 0
              ? ((currentValue - prevValue) / Math.abs(prevValue)) * 100
              : null;

          latestMetrics[companyId] = {
            name: best.current.metric_name,
            value: currentValue,
            previousValue: prevValue,
            percentChange,
            periodLabel: best.current.period_start
              ? formatPeriodLabel(best.current.period_start, best.current.period_type)
              : null,
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight" data-onboarding="dashboard-title">Dashboard</h1>
        <AddCompanyFlow />
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {[
          { label: "Portfolio companies", subtitle: "Total companies in your portfolio", value: String(companies.filter(c => !c.isHidden).length), href: "/contacts", icon: Building2, gradient: "kpi-gradient-blue" },
          { label: "Awaiting submission", subtitle: "Companies with pending metric requests", value: String(awaitingCompanyCount), href: "/metric-requests", icon: Building2, gradient: "kpi-gradient-amber" },
          { label: "Submitted this week", subtitle: "Companies that sent data in the last 7 days", value: String(submittedThisWeekCount), href: "/metric-requests", icon: CheckCircle2, gradient: "kpi-gradient-emerald" },
        ].map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card-hover-lift group rounded-xl ${card.gradient} p-5`}
          >
            <div className="flex items-start justify-between">
              <div className="text-xs font-medium uppercase tracking-wide text-text-muted group-hover:text-text-muted">{card.label}</div>
              <card.icon className="h-4 w-4 text-text-faint" />
            </div>
            <div className="mt-3 text-3xl font-bold tracking-tight">{card.value}</div>
            <div className="mt-1 text-xs text-text-tertiary">{card.subtitle}</div>
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
            href: "/contacts/import",
            completed: companies.length > 0,
          },
          {
            id: "founder-connected",
            label: "Connect with a founder",
            description: "Wait for a founder to join and approve your access",
            href: "/companies",
            completed: companies.some((c) => c.founder_id !== null),
          },
          {
            id: "request",
            label: "Send your first metric request",
            description: "Ask portfolio companies to submit their metrics",
            href: "/metric-requests/new",
            completed: awaitingCompanyCount > 0 || submittedThisWeekCount > 0,
          },
          {
            id: "add_metrics",
            label: "Add metrics for a company",
            description: "Enter metrics manually or upload historical data",
            href: "/companies",
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

      <DashboardTabs
        companies={companies}
        latestMetrics={latestMetrics}
        secondaryMetrics={secondaryMetrics}
        lastSubmittedAt={lastSubmittedAt}
      />
    </div>
  );
}

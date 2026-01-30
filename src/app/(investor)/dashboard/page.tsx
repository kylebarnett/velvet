import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { DashboardContent } from "./dashboard-content";

export const dynamic = "force-dynamic";

type MetricValue = {
  metric_name: string;
  value: unknown;
  period_start: string;
  company_id: string;
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

  // Get portfolio companies
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select(`
      id,
      approval_status,
      logo_url,
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
    };
  }).filter((c) => c.id);

  // Get company IDs that are approved
  const approvedCompanyIds = companies
    .filter((c) => ["auto_approved", "approved"].includes(c.approvalStatus))
    .map((c) => c.id);

  // Fetch latest metrics for approved companies
  let latestMetrics: Record<
    string,
    { name: string; value: number | null; previousValue: number | null; percentChange: number | null }
  > = {};

  if (approvedCompanyIds.length > 0) {
    // Get recent metric values
    const { data: metricValues } = await supabase
      .from("company_metric_values")
      .select("company_id, metric_name, value, period_start")
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
      }

      for (const [companyId, values] of byCompany) {
        // Sort by period_start desc
        values.sort(
          (a, b) =>
            new Date(b.period_start).getTime() - new Date(a.period_start).getTime()
        );

        // Find priority metric
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

  // Count pending requests
  const { count: pendingRequests } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "pending");

  // Count recent submissions (this week)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const { count: recentSubmissions } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id)
    .eq("status", "submitted")
    .gte("updated_at", weekAgo.toISOString());

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-white/60">
          Portfolio overview and recent metric activity.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: "Portfolio companies", value: String(companies.length) },
          { label: "Pending requests", value: String(pendingRequests ?? 0) },
          { label: "Submitted this week", value: String(recentSubmissions ?? 0) },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="text-sm text-white/60">{card.label}</div>
            <div className="mt-2 text-2xl font-semibold">{card.value}</div>
          </div>
        ))}
      </div>

      {companies.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No companies in your portfolio yet.</p>
          <Link
            href="/portfolio/import"
            className="mt-2 inline-block text-sm underline underline-offset-4 hover:text-white"
          >
            Import contacts to get started
          </Link>
        </div>
      ) : (
        <DashboardContent companies={companies} latestMetrics={latestMetrics} />
      )}
    </div>
  );
}

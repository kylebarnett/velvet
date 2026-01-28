import Link from "next/link";

import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyDashboardPage({
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
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        Company not in your portfolio.
      </div>
    );
  }

  // Get company info
  const { data: company } = await supabase
    .from("companies")
    .select("id, name, website, stage, industry, business_model, founder_id")
    .eq("id", companyId)
    .single();

  if (!company) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200">
        Company not found.
      </div>
    );
  }

  const isApproved =
    relationship.approval_status === "auto_approved" ||
    relationship.approval_status === "approved";

  // Get requests for this company
  const { data: requests } = await supabase
    .from("metric_requests")
    .select(`
      id,
      period_start,
      period_end,
      status,
      due_date,
      created_at,
      metric_definitions (
        name,
        period_type
      )
    `)
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(20);

  // Get metric values if approved
  let metricValues: any[] = [];
  if (isApproved) {
    const { data } = await supabase
      .from("company_metric_values")
      .select("id, metric_name, period_type, period_start, period_end, value, submitted_at")
      .eq("company_id", companyId)
      .order("submitted_at", { ascending: false })
      .limit(20);
    metricValues = data ?? [];
  }

  const formatLabel = (s: string | null) =>
    s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : null;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">{company.name}</h1>
          {company.founder_id ? (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200">
              Founder joined
            </span>
          ) : (
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
              Pending signup
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 text-sm text-white/60">
          {company.website && <span>{company.website}</span>}
          {formatLabel(company.stage) && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {formatLabel(company.stage)}
            </span>
          )}
          {formatLabel(company.industry) && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {formatLabel(company.industry)}
            </span>
          )}
          {formatLabel(company.business_model) && (
            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
              {formatLabel(company.business_model)}
            </span>
          )}
        </div>
      </div>

      {!isApproved && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Your access is {relationship.approval_status}. The founder needs to approve your access before you can see metric data.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {/* Requests */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Metric requests</div>
            <Link
              href="/requests/new"
              className="text-xs text-white/50 hover:text-white"
            >
              New request
            </Link>
          </div>
          {(requests ?? []).length === 0 ? (
            <div className="mt-3 text-sm text-white/60">No requests yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {(requests ?? []).map((req) => {
                const defRaw = req.metric_definitions;
                const def = (Array.isArray(defRaw) ? defRaw[0] : defRaw) as { name: string; period_type: string } | null;
                const statusStyle: Record<string, string> = {
                  pending: "bg-amber-500/20 text-amber-200",
                  submitted: "bg-emerald-500/20 text-emerald-200",
                  overdue: "bg-red-500/20 text-red-200",
                };
                const statusClass = statusStyle[req.status] ?? "bg-white/10 text-white/60";

                return (
                  <div
                    key={req.id}
                    className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
                  >
                    <div>
                      <span className="text-sm">{def?.name ?? "Unknown"}</span>
                      <span className="ml-2 text-xs text-white/40">
                        {req.period_start} to {req.period_end}
                      </span>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-xs ${statusClass}`}>
                      {req.status}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submitted values */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">Submitted metrics</div>
            <Link
              href={`/dashboard/${companyId}/metrics`}
              className="text-xs text-white/50 hover:text-white"
            >
              View all
            </Link>
          </div>
          {!isApproved ? (
            <div className="mt-3 text-sm text-white/60">
              Approval required to view metrics.
            </div>
          ) : metricValues.length === 0 ? (
            <div className="mt-3 text-sm text-white/60">No submissions yet.</div>
          ) : (
            <div className="mt-3 space-y-2">
              {metricValues.map((mv: any) => (
                <div
                  key={mv.id}
                  className="flex items-center justify-between rounded-lg border border-white/5 px-3 py-2"
                >
                  <div>
                    <span className="text-sm">{mv.metric_name}</span>
                    <span className="ml-2 text-xs text-white/40">
                      {mv.period_start} to {mv.period_end}
                    </span>
                  </div>
                  <span className="font-mono text-sm">{mv.value?.raw ?? "—"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

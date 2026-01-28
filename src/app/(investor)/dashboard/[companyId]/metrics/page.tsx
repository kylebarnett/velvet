import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function CompanyMetricsPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  const { companyId } = await params;

  // Verify relationship and approval
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

  const isApproved =
    relationship.approval_status === "auto_approved" ||
    relationship.approval_status === "approved";

  // Get company name
  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", companyId)
    .single();

  // Get all metric values
  let metricValues: any[] = [];
  if (isApproved) {
    const { data } = await supabase
      .from("company_metric_values")
      .select("id, metric_name, period_type, period_start, period_end, value, notes, submitted_at")
      .eq("company_id", companyId)
      .order("metric_name")
      .order("period_start", { ascending: false });
    metricValues = data ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">
          {company?.name ?? "Company"} &mdash; Metrics
        </h1>
        <p className="text-sm text-white/60">
          All submitted metric values for this company.
        </p>
      </div>

      {!isApproved && (
        <div className="rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
          Approval required. The founder needs to approve your access to view metric data.
        </div>
      )}

      {isApproved && metricValues.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">No metric data submitted yet.</div>
        </div>
      )}

      {isApproved && metricValues.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="px-4 py-3 font-medium text-white/70">Metric</th>
                <th className="px-4 py-3 font-medium text-white/70">Period</th>
                <th className="px-4 py-3 font-medium text-white/70">Value</th>
                <th className="px-4 py-3 font-medium text-white/70">Notes</th>
                <th className="px-4 py-3 font-medium text-white/70">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {metricValues.map((mv: any) => (
                <tr key={mv.id} className="border-b border-white/5">
                  <td className="px-4 py-3">
                    <div className="font-medium">{mv.metric_name}</div>
                    <div className="text-xs text-white/50">{mv.period_type}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70">
                    {mv.period_start} to {mv.period_end}
                  </td>
                  <td className="px-4 py-3 font-mono">{mv.value?.raw ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">{mv.notes ?? "—"}</td>
                  <td className="px-4 py-3 text-white/50">
                    {new Date(mv.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

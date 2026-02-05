import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { CompanyMetricsClient } from "./client";

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
  let metricValues: Array<{
    id: string;
    metric_name: string;
    period_type: string;
    period_start: string;
    period_end: string;
    value: { raw?: string } | null;
    notes: string | null;
    source: string;
    ai_confidence: number | null;
    submitted_at: string;
  }> = [];
  if (isApproved) {
    const { data } = await supabase
      .from("company_metric_values")
      .select("id, metric_name, period_type, period_start, period_end, value, notes, source, ai_confidence, submitted_at")
      .eq("company_id", companyId)
      .order("metric_name")
      .order("period_start", { ascending: false });
    metricValues = data ?? [];
  }

  return (
    <CompanyMetricsClient
      companyId={companyId}
      companyName={company?.name ?? "Company"}
      isApproved={isApproved}
      metricValues={metricValues}
    />
  );
}

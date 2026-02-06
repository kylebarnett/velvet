import { requireRole } from "@/lib/auth/require-role";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TrendsClient } from "@/components/reports/trends/trends-client";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  const user = await requireRole("investor");
  const supabase = await createSupabaseServerClient();

  // Get approved company IDs
  const { data: relationships } = await supabase
    .from("investor_company_relationships")
    .select("company_id")
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  const companyIds = (relationships ?? []).map((r) => r.company_id);

  // Get distinct metric names from company_metric_values for approved companies
  let metricNames: string[] = [];

  if (companyIds.length > 0) {
    const { data: metricRows } = await supabase
      .from("company_metric_values")
      .select("metric_name")
      .in("company_id", companyIds);

    // Deduplicate, preserving original casing
    const nameMap = new Map<string, string>();
    for (const row of metricRows ?? []) {
      const normalized = row.metric_name.toLowerCase().trim();
      if (!nameMap.has(normalized)) {
        nameMap.set(normalized, row.metric_name.trim());
      }
    }

    metricNames = [...nameMap.values()].sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase())
    );
  }

  return <TrendsClient availableMetrics={metricNames} />;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export type MergedMetricValue = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  value: { raw: string; unit?: string | null };
  dataSource: "founder" | "investor_historical";
  submittedAt: string;
  source: string;
  notes: string | null;
};

/**
 * Fetch and merge metric values for a company from both founder data
 * (company_metric_values) and investor private data (investor_metric_values).
 *
 * Founder values take priority when both exist for the same metric+period.
 */
export async function getMergedMetrics(
  supabase: SupabaseClient,
  companyId: string,
  investorId: string,
): Promise<MergedMetricValue[]> {
  // Parallel fetch from both tables
  const [founderResult, investorResult] = await Promise.all([
    supabase
      .from("company_metric_values")
      .select("metric_name, period_type, period_start, period_end, value, submitted_at, source, notes")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false }),
    supabase
      .from("investor_metric_values")
      .select("metric_name, period_type, period_start, period_end, value, submitted_at, source, notes")
      .eq("investor_id", investorId)
      .eq("company_id", companyId)
      .order("period_start", { ascending: false }),
  ]);

  const founderValues = founderResult.data ?? [];
  const investorValues = investorResult.data ?? [];

  // Build a set of founder keys for dedup
  const founderKeys = new Set<string>();
  const result: MergedMetricValue[] = [];

  for (const fv of founderValues) {
    const key = `${fv.metric_name.toLowerCase()}:${fv.period_type}:${fv.period_start}`;
    founderKeys.add(key);
    result.push({
      metricName: fv.metric_name,
      periodType: fv.period_type,
      periodStart: fv.period_start,
      periodEnd: fv.period_end,
      value: fv.value as { raw: string; unit?: string | null },
      dataSource: "founder",
      submittedAt: fv.submitted_at,
      source: fv.source,
      notes: fv.notes,
    });
  }

  // Add investor values only where founder doesn't have data
  for (const iv of investorValues) {
    const key = `${iv.metric_name.toLowerCase()}:${iv.period_type}:${iv.period_start}`;
    if (!founderKeys.has(key)) {
      result.push({
        metricName: iv.metric_name,
        periodType: iv.period_type,
        periodStart: iv.period_start,
        periodEnd: iv.period_end,
        value: iv.value as { raw: string; unit?: string | null },
        dataSource: "investor_historical",
        submittedAt: iv.submitted_at,
        source: iv.source,
        notes: iv.notes,
      });
    }
  }

  return result;
}

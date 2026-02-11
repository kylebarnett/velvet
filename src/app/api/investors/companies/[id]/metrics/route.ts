import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

// GET - Get all metric values for a company (investor view)
// Merges founder data (company_metric_values) with investor private data (investor_metric_values)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id: companyId } = await params;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id, approval_status")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  if (!["auto_approved", "approved"].includes(relationship.approval_status)) {
    return jsonError("Access pending approval.", 403);
  }

  // Fetch founder data and investor private data in parallel
  const [founderResult, investorResult] = await Promise.all([
    supabase
      .from("company_metric_values")
      .select(`
        id,
        metric_name,
        period_type,
        period_start,
        period_end,
        value,
        notes,
        submitted_at,
        updated_at
      `)
      .eq("company_id", companyId)
      .order("period_start", { ascending: false }),
    supabase
      .from("investor_metric_values")
      .select(`
        id,
        metric_name,
        period_type,
        period_start,
        period_end,
        value,
        notes,
        submitted_at,
        updated_at
      `)
      .eq("investor_id", user.id)
      .eq("company_id", companyId)
      .order("period_start", { ascending: false }),
  ]);

  if (founderResult.error) {
    logger.error("Failed to fetch company metrics:", founderResult.error.message);
    return jsonError("Failed to process request.", 500);
  }

  const founderMetrics = (founderResult.data ?? []).map((m) => ({
    ...m,
    data_source: "founder" as const,
  }));

  const investorMetrics = investorResult.data ?? [];

  // Build a set of founder metric keys for dedup
  const founderKeys = new Set(
    founderMetrics.map(
      (m) => `${m.metric_name.toLowerCase()}:${m.period_type}:${m.period_start}`,
    ),
  );

  // Add investor values where founder doesn't have data
  const investorFillGaps = investorMetrics
    .filter((m) => {
      const key = `${m.metric_name.toLowerCase()}:${m.period_type}:${m.period_start}`;
      return !founderKeys.has(key);
    })
    .map((m) => ({
      ...m,
      data_source: "investor_historical" as const,
    }));

  const mergedMetrics = [...founderMetrics, ...investorFillGaps];

  return NextResponse.json({
    metrics: mergedMetrics,
    companyId,
  });
}

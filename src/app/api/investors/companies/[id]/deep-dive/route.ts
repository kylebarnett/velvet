import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";
import { extractNumericValue } from "@/lib/reports/aggregation";
import { formatValue } from "@/components/charts/types";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id: companyId } = await params;
  const url = new URL(req.url);
  const periodType = url.searchParams.get("periodType") ?? "quarterly";

  // Verify investor has approved relationship
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

  // Fetch company info and all metric values in parallel
  const [companyResult, metricsResult, benchmarksResult] = await Promise.all([
    supabase
      .from("companies")
      .select("id, name, industry, stage, website, logo_url")
      .eq("id", companyId)
      .single(),
    supabase
      .from("company_metric_values")
      .select("id, metric_name, period_type, period_start, period_end, value, submitted_at")
      .eq("company_id", companyId)
      .order("period_start", { ascending: false }),
    supabase
      .from("metric_benchmarks")
      .select("metric_name, p25, p50, p75, p90, sample_size")
      .order("calculated_at", { ascending: false }),
  ]);

  if (companyResult.error || !companyResult.data) {
    return jsonError("Company not found.", 404);
  }

  const company = companyResult.data;
  const allValues = (metricsResult.data ?? []).filter(
    (v) => v.period_type === periodType
  );
  const allBenchmarks = benchmarksResult.data ?? [];

  // Latest value per metric
  const latestMap = new Map<string, typeof allValues[0]>();
  for (const v of allValues) {
    if (!latestMap.has(v.metric_name)) {
      latestMap.set(v.metric_name, v);
    }
  }

  const latestMetrics = Array.from(latestMap.entries()).map(([name, v]) => {
    const num = extractNumericValue(v.value);
    return {
      name,
      value: num,
      formattedValue: formatValue(num, name),
      periodStart: v.period_start,
      periodEnd: v.period_end,
      periodType: v.period_type,
      submittedAt: v.submitted_at,
    };
  });

  // Time series per metric (last 12 periods)
  const timeSeries: Record<string, Array<{
    periodStart: string;
    periodEnd: string;
    value: number;
  }>> = {};

  for (const v of allValues) {
    const num = extractNumericValue(v.value);
    if (num === null) continue;
    if (!timeSeries[v.metric_name]) timeSeries[v.metric_name] = [];
    if (timeSeries[v.metric_name].length < 12) {
      timeSeries[v.metric_name].push({
        periodStart: v.period_start,
        periodEnd: v.period_end,
        value: num,
      });
    }
  }

  // Reverse to chronological order
  for (const key of Object.keys(timeSeries)) {
    timeSeries[key].reverse();
  }

  // Benchmark positions for this company
  const benchmarkPositions: Array<{
    metricName: string;
    value: number;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    percentile: number | null;
  }> = [];

  // Deduplicate benchmarks (keep first = most recent)
  const benchmarkMap = new Map<string, typeof allBenchmarks[0]>();
  for (const b of allBenchmarks) {
    if (!benchmarkMap.has(b.metric_name)) benchmarkMap.set(b.metric_name, b);
  }

  for (const [metricName, benchmark] of benchmarkMap) {
    const latest = latestMap.get(metricName);
    if (!latest) continue;
    const num = extractNumericValue(latest.value);
    if (num === null) continue;

    let percentile: number | null = null;
    if (num <= benchmark.p25) percentile = Math.round((num / benchmark.p25) * 25);
    else if (num <= benchmark.p50) percentile = 25 + Math.round(((num - benchmark.p25) / (benchmark.p50 - benchmark.p25)) * 25);
    else if (num <= benchmark.p75) percentile = 50 + Math.round(((num - benchmark.p50) / (benchmark.p75 - benchmark.p50)) * 25);
    else if (num <= benchmark.p90) percentile = 75 + Math.round(((num - benchmark.p75) / (benchmark.p90 - benchmark.p75)) * 15);
    else percentile = 90 + Math.min(10, Math.round(((num - benchmark.p90) / benchmark.p90) * 10));

    benchmarkPositions.push({
      metricName,
      value: num,
      p25: benchmark.p25,
      p50: benchmark.p50,
      p75: benchmark.p75,
      p90: benchmark.p90,
      percentile,
    });
  }

  // Last submission date
  const lastSubmission = allValues.length > 0
    ? allValues.reduce((a, b) =>
        new Date(a.submitted_at ?? 0).getTime() > new Date(b.submitted_at ?? 0).getTime() ? a : b
      ).submitted_at
    : null;

  return NextResponse.json({
    company: {
      id: company.id,
      name: company.name,
      industry: company.industry,
      stage: company.stage,
      website: company.website,
      logoUrl: company.logo_url,
      lastSubmission,
    },
    periodType,
    latestMetrics,
    timeSeries,
    benchmarkPositions,
  });
}

import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { calculatePercentiles } from "@/lib/benchmarks/calculate";

type MetricValueRow = {
  metric_name: string;
  period_type: string;
  value: number | string;
  company_id: string;
};

type CompanyRow = {
  id: string;
  industry: string | null;
  stage: string | null;
};

type GroupKey = string;

function makeGroupKey(
  metricName: string,
  periodType: string,
  industry: string | null,
  stage: string | null,
): GroupKey {
  return `${metricName.toLowerCase()}|${periodType}|${industry ?? ""}|${stage ?? ""}`;
}

async function handler(req: Request) {
  // Verify cron secret if set
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Admin client bypasses RLS — needed to aggregate across all companies
  const adminClient = createSupabaseAdminClient();

  // Fetch all companies with their industry/stage
  const { data: companies, error: companyError } = await adminClient
    .from("companies")
    .select("id, industry, stage");

  if (companyError) {
    return NextResponse.json(
      { error: `Failed to fetch companies: ${companyError.message}` },
      { status: 500 },
    );
  }

  const companyMap = new Map<string, CompanyRow>();
  for (const c of (companies ?? []) as CompanyRow[]) {
    companyMap.set(c.id, c);
  }

  // Fetch all metric values — we take the most recent value per company per metric
  // to avoid double-counting historical values
  const { data: metricValues, error: mvError } = await adminClient
    .from("company_metric_values")
    .select("metric_name, period_type, value, company_id")
    .order("period_start", { ascending: false });

  if (mvError) {
    return NextResponse.json(
      { error: `Failed to fetch metric values: ${mvError.message}` },
      { status: 500 },
    );
  }

  // Deduplicate: keep only the most recent value per company per metric+periodType
  const latestValues = new Map<string, MetricValueRow>();
  for (const row of (metricValues ?? []) as MetricValueRow[]) {
    const key = `${row.company_id}|${row.metric_name.toLowerCase()}|${row.period_type}`;
    if (!latestValues.has(key)) {
      latestValues.set(key, row);
    }
  }

  // Group values by metric_name x period_type x industry x stage
  // Also track "all industry" groups (industry=null) and "all stage" groups (stage=null)
  type GroupData = {
    metricName: string;
    periodType: string;
    industry: string | null;
    stage: string | null;
    values: number[];
  };

  const groups = new Map<GroupKey, GroupData>();

  function ensureGroup(
    metricName: string,
    periodType: string,
    industry: string | null,
    stage: string | null,
  ): GroupData {
    const key = makeGroupKey(metricName, periodType, industry, stage);
    let group = groups.get(key);
    if (!group) {
      group = { metricName, periodType, industry, stage, values: [] };
      groups.set(key, group);
    }
    return group;
  }

  for (const row of latestValues.values()) {
    const numericValue =
      typeof row.value === "string" ? parseFloat(row.value) : row.value;
    if (isNaN(numericValue)) continue;

    const company = companyMap.get(row.company_id);
    const industry = company?.industry ?? null;
    const stage = company?.stage ?? null;
    const metricNameLower = row.metric_name.toLowerCase().trim();

    // Group by specific industry + stage
    if (industry && stage) {
      ensureGroup(metricNameLower, row.period_type, industry, stage).values.push(
        numericValue,
      );
    }

    // Group by industry only (all stages)
    if (industry) {
      ensureGroup(metricNameLower, row.period_type, industry, null).values.push(
        numericValue,
      );
    }

    // Group by stage only (all industries)
    if (stage) {
      ensureGroup(metricNameLower, row.period_type, null, stage).values.push(
        numericValue,
      );
    }

    // Overall (all industries, all stages)
    ensureGroup(metricNameLower, row.period_type, null, null).values.push(
      numericValue,
    );
  }

  // Calculate percentiles for each group and upsert into metric_benchmarks
  let benchmarksUpdated = 0;
  let metricsProcessed = 0;
  const upsertBatch: Array<{
    metric_name: string;
    period_type: string;
    industry: string | null;
    stage: string | null;
    p25: number;
    p50: number;
    p75: number;
    p90: number;
    sample_size: number;
    calculated_at: string;
  }> = [];

  const now = new Date().toISOString();

  for (const group of groups.values()) {
    metricsProcessed++;

    const percentiles = calculatePercentiles(group.values);
    if (!percentiles) continue; // fewer than 5 values

    upsertBatch.push({
      metric_name: group.metricName,
      period_type: group.periodType,
      industry: group.industry,
      stage: group.stage,
      p25: percentiles.p25,
      p50: percentiles.p50,
      p75: percentiles.p75,
      p90: percentiles.p90,
      sample_size: group.values.length,
      calculated_at: now,
    });
  }

  // Upsert in batches of 200
  const BATCH_SIZE = 200;
  for (let i = 0; i < upsertBatch.length; i += BATCH_SIZE) {
    const batch = upsertBatch.slice(i, i + BATCH_SIZE);

    const { error: upsertError } = await adminClient
      .from("metric_benchmarks")
      .upsert(batch, {
        onConflict: "metric_name,period_type,industry,stage",
      });

    if (upsertError) {
      return NextResponse.json(
        {
          error: `Failed to upsert benchmarks: ${upsertError.message}`,
          benchmarksUpdated,
        },
        { status: 500 },
      );
    }

    benchmarksUpdated += batch.length;
  }

  return NextResponse.json({
    ok: true,
    benchmarksUpdated,
    metricsProcessed,
    groupsWithSufficientData: upsertBatch.length,
  });
}

export async function POST(req: Request) {
  return handler(req);
}

export async function GET(req: Request) {
  return handler(req);
}

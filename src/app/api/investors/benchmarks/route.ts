import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { getCompanyPercentile } from "@/lib/benchmarks/calculate";
import { formatValue } from "@/components/charts/types";

const querySchema = z.object({
  metric: z.string().min(1),
  periodType: z.string().default("quarterly"),
  industry: z.string().optional(),
  stage: z.string().optional(),
});

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Parse and validate query params
  const url = new URL(req.url);
  const parseResult = querySchema.safeParse({
    metric: url.searchParams.get("metric") ?? "",
    periodType: url.searchParams.get("periodType") ?? "quarterly",
    industry: url.searchParams.get("industry") || undefined,
    stage: url.searchParams.get("stage") || undefined,
  });

  if (!parseResult.success) {
    return jsonError("Missing or invalid 'metric' query parameter.", 400);
  }

  const { metric, periodType, industry, stage } = parseResult.data;

  // Fetch benchmark data from metric_benchmarks
  let benchmarkQuery = supabase
    .from("metric_benchmarks")
    .select("p25, p50, p75, p90, sample_size, calculated_at")
    .ilike("metric_name", metric)
    .eq("period_type", periodType);

  if (industry) {
    benchmarkQuery = benchmarkQuery.eq("industry", industry);
  } else {
    benchmarkQuery = benchmarkQuery.is("industry", null);
  }

  if (stage) {
    benchmarkQuery = benchmarkQuery.eq("stage", stage);
  } else {
    benchmarkQuery = benchmarkQuery.is("stage", null);
  }

  const { data: benchmarkRows, error: benchmarkError } =
    await benchmarkQuery.limit(1);

  if (benchmarkError) return jsonError(benchmarkError.message, 500);

  const benchmark =
    benchmarkRows && benchmarkRows.length > 0 ? benchmarkRows[0] : null;

  // Get approved company IDs for this investor
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(
      `
      company_id,
      companies (
        id,
        name,
        industry,
        stage
      )
    `,
    )
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) return jsonError(relError.message, 500);

  const companyMap = new Map<
    string,
    { id: string; name: string; industry: string | null; stage: string | null }
  >();

  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as {
          id: string;
          name: string;
          industry: string | null;
          stage: string | null;
        } | undefined)
      : (companyRaw as {
          id: string;
          name: string;
          industry: string | null;
          stage: string | null;
        } | null);
    if (company) {
      companyMap.set(company.id, company);
    }
  }

  const companyIds = Array.from(companyMap.keys());

  // Fetch the most recent metric value per company for this metric
  // We want the latest period's value for each company
  type MetricRow = {
    company_id: string;
    value: number | string;
    period_start: string;
  };

  let companies: Array<{
    id: string;
    name: string;
    value: number;
    formattedValue: string;
    percentile: number | null;
    industry: string | null;
    stage: string | null;
  }> = [];

  if (companyIds.length > 0) {
    const { data: metricRows, error: metricError } = await supabase
      .from("company_metric_values")
      .select("company_id, value, period_start")
      .in("company_id", companyIds)
      .ilike("metric_name", metric)
      .eq("period_type", periodType)
      .order("period_start", { ascending: false });

    if (metricError) return jsonError(metricError.message, 500);

    // Take the most recent value per company
    const latestByCompany = new Map<string, MetricRow>();
    for (const row of (metricRows ?? []) as MetricRow[]) {
      if (!latestByCompany.has(row.company_id)) {
        latestByCompany.set(row.company_id, row);
      }
    }

    companies = Array.from(latestByCompany.entries())
      .map(([companyId, row]) => {
        const company = companyMap.get(companyId);
        if (!company) return null;

        const numericValue =
          typeof row.value === "string" ? parseFloat(row.value) : row.value;
        if (isNaN(numericValue)) return null;

        const percentile =
          benchmark
            ? getCompanyPercentile(numericValue, {
                p25: Number(benchmark.p25),
                p50: Number(benchmark.p50),
                p75: Number(benchmark.p75),
                p90: Number(benchmark.p90),
              })
            : null;

        return {
          id: company.id,
          name: company.name,
          value: numericValue,
          formattedValue: formatValue(numericValue, metric),
          percentile,
          industry: company.industry,
          stage: company.stage,
        };
      })
      .filter(
        (
          c,
        ): c is {
          id: string;
          name: string;
          value: number;
          formattedValue: string;
          percentile: number | null;
          industry: string | null;
          stage: string | null;
        } => c !== null,
      )
      .sort((a, b) => b.value - a.value);
  }

  return NextResponse.json(
    {
      benchmark: benchmark
        ? {
            p25: Number(benchmark.p25),
            p50: Number(benchmark.p50),
            p75: Number(benchmark.p75),
            p90: Number(benchmark.p90),
            sample_size: benchmark.sample_size,
            calculated_at: benchmark.calculated_at,
          }
        : null,
      companies,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    },
  );
}

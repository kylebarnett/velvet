import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { extractNumericValue } from "@/lib/reports/aggregation";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const querySchema = z.object({
  companyIds: z
    .string()
    .min(1, "companyIds is required")
    .transform((v) => v.split(",").filter(Boolean))
    .refine((ids) => ids.length >= 2 && ids.length <= 8, "Select 2-8 companies")
    .refine((ids) => ids.every((id) => UUID_REGEX.test(id)), "Invalid company ID format"),
  metrics: z
    .string()
    .min(1, "metrics is required")
    .transform((v) => v.split(",").filter(Boolean))
    .refine((names) => names.length >= 1, "Select at least 1 metric"),
  periodType: z.enum(["monthly", "quarterly", "yearly"]).default("quarterly"),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

type MetricValueRow = {
  company_id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
};

// GET - Compare metric values across selected companies
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const rawParams = {
    companyIds: url.searchParams.get("companyIds") ?? "",
    metrics: url.searchParams.get("metrics") ?? "",
    periodType: url.searchParams.get("periodType") ?? "quarterly",
    startDate: url.searchParams.get("startDate") ?? undefined,
    endDate: url.searchParams.get("endDate") ?? undefined,
  };

  const parsed = querySchema.safeParse(rawParams);
  if (!parsed.success) {
    const message = parsed.error.issues.map((i) => i.message).join("; ");
    return jsonError(message, 400);
  }

  const { companyIds, metrics, periodType, startDate, endDate } = parsed.data;

  // Verify all companies are in investor's approved portfolio
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select(`
      company_id,
      companies (
        id,
        name
      )
    `)
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"])
    .in("company_id", companyIds);

  if (relError) return jsonError(relError.message, 500);

  // Build a map of verified company IDs to names
  const verifiedCompanies = new Map<string, string>();
  for (const rel of relationships ?? []) {
    const companyRaw = rel.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string } | undefined)
      : (companyRaw as { id: string; name: string } | null);
    if (company) {
      verifiedCompanies.set(company.id, company.name);
    }
  }

  // Check that all requested company IDs are verified
  const unverifiedIds = companyIds.filter((id) => !verifiedCompanies.has(id));
  if (unverifiedIds.length > 0) {
    return jsonError("One or more companies are not in your portfolio.", 403);
  }

  // Fetch metric values for the selected companies and metrics
  // Use case-insensitive matching by querying all and filtering in JS
  let query = supabase
    .from("company_metric_values")
    .select("company_id, metric_name, period_type, period_start, period_end, value")
    .in("company_id", companyIds)
    .eq("period_type", periodType)
    .order("period_start", { ascending: true });

  if (startDate) {
    query = query.gte("period_start", startDate);
  }
  if (endDate) {
    query = query.lte("period_start", endDate);
  }

  const { data: metricValues, error: mvError } = await query;
  if (mvError) return jsonError(mvError.message, 500);

  const rows = (metricValues ?? []) as MetricValueRow[];

  // Normalize requested metric names to lowercase for matching
  const requestedMetricsLower = metrics.map((m) => m.toLowerCase().trim());

  // Build response structure: one entry per company with metrics grouped
  const companiesResult: Array<{
    id: string;
    name: string;
    metrics: Record<
      string,
      Array<{ period_start: string; period_end: string; value: number }>
    >;
  }> = [];

  for (const companyId of companyIds) {
    const companyName = verifiedCompanies.get(companyId) ?? "Unknown";
    const companyMetrics: Record<
      string,
      Array<{ period_start: string; period_end: string; value: number }>
    > = {};

    // Filter rows for this company
    const companyRows = rows.filter((r) => r.company_id === companyId);

    for (const row of companyRows) {
      const metricNameLower = row.metric_name.toLowerCase().trim();

      // Check if this metric was requested (case-insensitive)
      if (!requestedMetricsLower.includes(metricNameLower)) continue;

      const numValue = extractNumericValue(row.value);
      if (numValue === null) continue;

      // Use the original metric name from the request for consistent keys
      const matchIndex = requestedMetricsLower.indexOf(metricNameLower);
      const metricKey = metrics[matchIndex];

      if (!companyMetrics[metricKey]) {
        companyMetrics[metricKey] = [];
      }

      companyMetrics[metricKey].push({
        period_start: row.period_start,
        period_end: row.period_end,
        value: numValue,
      });
    }

    // Sort each metric's values by period_start ascending
    for (const key of Object.keys(companyMetrics)) {
      companyMetrics[key].sort(
        (a, b) => new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      );
    }

    companiesResult.push({
      id: companyId,
      name: companyName,
      metrics: companyMetrics,
    });
  }

  return NextResponse.json(
    { companies: companiesResult },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getQuarterDates, getPreviousQuarter } from "@/lib/tear-sheets/quarter-utils";

type MetricRow = {
  metric_name: string;
  value: unknown;
  period_type: string;
  period_start: string;
  period_end: string;
};

function getNumericValue(value: unknown): string | null {
  if (value == null) return null;
  if (typeof value === "number") return value.toString();
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const raw = (value as Record<string, unknown>).raw;
    if (typeof raw === "string") return raw;
    if (typeof raw === "number") return raw.toString();
    const v = (value as Record<string, unknown>).value;
    if (typeof v === "number") return v.toString();
    if (typeof v === "string") return v;
  }
  return null;
}

// GET - Get metrics for an investor tear sheet with source control
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  // Verify ownership and get quarter/year/company
  const { data: tearSheet } = await supabase
    .from("tear_sheets")
    .select("id, company_id, quarter, year, content")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  const { quarter, year, company_id: companyId } = tearSheet;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .in("approval_status", ["auto_approved", "approved"])
    .single();

  if (!relationship) {
    return jsonError("Company not in portfolio or not approved.", 403);
  }

  // Use admin client to bypass RLS for metric reads — ownership verified above
  const admin = createSupabaseAdminClient();

  // Determine metric source from query param or content
  const url = new URL(req.url);
  const sourceParam = url.searchParams.get("source");
  const contentSources = (tearSheet.content as Record<string, unknown>)?.metricSources as string | undefined;
  const metricSource = sourceParam || contentSources || "all";

  const currentDates = getQuarterDates(quarter, year);
  if (!currentDates) return jsonError("Invalid quarter.", 400);

  const prev = getPreviousQuarter(quarter, year);
  const prevDates = prev ? getQuarterDates(prev.quarter, prev.year) : null;

  // Fetch current quarter metrics based on source control
  let currentMetrics: MetricRow[] = [];

  if (metricSource === "all" || metricSource === "founder") {
    const { data, error } = await admin
      .from("company_metric_values")
      .select("metric_name, value, period_type, period_start, period_end")
      .eq("company_id", companyId)
      .gte("period_start", currentDates.periodStart)
      .lte("period_end", currentDates.periodEnd);

    if (error) {
      logger.error("Tear sheet founder metrics error:", error);
      return jsonError("Failed to load metrics.", 500);
    }
    currentMetrics = (data ?? []) as MetricRow[];
  }

  if (metricSource === "all" || metricSource === "investor") {
    const { data, error } = await admin
      .from("investor_metric_values")
      .select("metric_name, value, period_type, period_start, period_end")
      .eq("investor_id", user.id)
      .eq("company_id", companyId)
      .gte("period_start", currentDates.periodStart)
      .lte("period_end", currentDates.periodEnd);

    if (error) {
      logger.error("Tear sheet investor metrics error:", error);
      return jsonError("Failed to load metrics.", 500);
    }

    const investorRows = (data ?? []) as MetricRow[];

    if (metricSource === "all") {
      // Founder values take priority — only add investor values for new metrics
      const existingKeys = new Set(currentMetrics.map((m) => m.metric_name.toLowerCase()));
      for (const row of investorRows) {
        if (!existingKeys.has(row.metric_name.toLowerCase())) {
          currentMetrics.push(row);
        }
      }
    } else {
      currentMetrics = investorRows;
    }
  }

  // Deduplicate: keep only the latest entry per metric name
  const dedupMap = new Map<string, MetricRow>();
  for (const m of currentMetrics) {
    const key = m.metric_name.toLowerCase();
    const existing = dedupMap.get(key);
    if (!existing || m.period_start > existing.period_start) {
      dedupMap.set(key, m);
    }
  }
  currentMetrics = Array.from(dedupMap.values());

  // Fetch previous quarter metrics for trend calculation
  let prevMetrics: MetricRow[] = [];

  if (prevDates) {
    if (metricSource === "all" || metricSource === "founder") {
      const { data } = await admin
        .from("company_metric_values")
        .select("metric_name, value, period_type, period_start, period_end")
        .eq("company_id", companyId)
        .gte("period_start", prevDates.periodStart)
        .lte("period_end", prevDates.periodEnd);
      prevMetrics = (data ?? []) as MetricRow[];
    }

    if (metricSource === "all" || metricSource === "investor") {
      const { data } = await admin
        .from("investor_metric_values")
        .select("metric_name, value, period_type, period_start, period_end")
        .eq("investor_id", user.id)
        .eq("company_id", companyId)
        .gte("period_start", prevDates.periodStart)
        .lte("period_end", prevDates.periodEnd);

      const investorRows = (data ?? []) as MetricRow[];

      if (metricSource === "all") {
        const existingKeys = new Set(prevMetrics.map((m) => m.metric_name.toLowerCase()));
        for (const row of investorRows) {
          if (!existingKeys.has(row.metric_name.toLowerCase())) {
            prevMetrics.push(row);
          }
        }
      } else {
        prevMetrics = investorRows;
      }
    }
  }

  // Build prev map (latest per metric name)
  const prevMap = new Map<string, string>();
  for (const m of prevMetrics) {
    const val = getNumericValue(m.value);
    if (val !== null) {
      prevMap.set(m.metric_name.toLowerCase(), val);
    }
  }

  const metrics = currentMetrics.map((m) => {
    const currentValue = getNumericValue(m.value);
    const previousValue = prevMap.get(m.metric_name.toLowerCase()) ?? null;

    let trend: "up" | "down" | "flat" = "flat";
    if (currentValue != null && previousValue != null) {
      const c = parseFloat(currentValue);
      const p = parseFloat(previousValue);
      if (!isNaN(c) && !isNaN(p)) {
        if (c > p) trend = "up";
        else if (c < p) trend = "down";
      }
    }

    return {
      metricName: m.metric_name,
      currentValue,
      previousValue,
      trend,
      periodType: m.period_type,
      periodStart: m.period_start,
      periodEnd: m.period_end,
    };
  });

  return NextResponse.json({ metrics });
}

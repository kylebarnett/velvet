import { NextResponse } from "next/server";

import { jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Public tear sheet by share token (no auth required)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  if (
    !token ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(token)
  ) {
    return jsonError("Tear sheet not found.", 404);
  }

  const supabase = createSupabaseAdminClient();

  // Query tear sheet by share token - must be published and sharing enabled
  const { data: tearSheet, error } = await supabase
    .from("tear_sheets")
    .select(`
      id,
      title,
      quarter,
      year,
      content,
      status,
      share_enabled,
      created_at,
      updated_at,
      company_id,
      companies ( name )
    `)
    .eq("share_token", token)
    .eq("share_enabled", true)
    .eq("status", "published")
    .single();

  if (error || !tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  // Extract company name from join
  const companyRaw = tearSheet.companies;
  const company = (
    Array.isArray(companyRaw) ? companyRaw[0] : companyRaw
  ) as { name: string } | null;

  // Only expose metrics the founder explicitly selected in the tear sheet
  const contentObj = (tearSheet.content ?? {}) as Record<string, unknown>;
  const visibleMetrics = (contentObj.visibleMetrics as string[]) ?? [];

  let metrics: Array<{
    metricName: string;
    currentValue: string | number | null;
    previousValue: number | null;
    trend: "up" | "down" | "flat";
  }> = [];

  const quarterDates = getQuarterDates(tearSheet.quarter, tearSheet.year);

  if (quarterDates && visibleMetrics.length > 0) {
    const prevQ = getPreviousQuarter(tearSheet.quarter, tearSheet.year);
    const prevDates = prevQ ? getQuarterDates(prevQ.quarter, prevQ.year) : null;

    const { data: currentMetrics } = await supabase
      .from("company_metric_values")
      .select("metric_name, value")
      .eq("company_id", tearSheet.company_id)
      .eq("period_start", quarterDates.periodStart)
      .in("metric_name", visibleMetrics);

    const prevMap = new Map<string, number>();
    if (prevDates) {
      const { data: prevData } = await supabase
        .from("company_metric_values")
        .select("metric_name, value")
        .eq("company_id", tearSheet.company_id)
        .eq("period_start", prevDates.periodStart)
        .in("metric_name", visibleMetrics);
      for (const m of prevData ?? []) {
        const val = parseFloat(extractValue(m.value));
        if (!isNaN(val)) prevMap.set(m.metric_name.toLowerCase(), val);
      }
    }

    metrics = (currentMetrics ?? []).map((m) => {
      const rawStr = extractValue(m.value);
      const currentValue = parseFloat(rawStr);
      const previousValue = prevMap.get(m.metric_name.toLowerCase()) ?? null;
      let trend: "up" | "down" | "flat" = "flat";
      if (previousValue !== null && !isNaN(currentValue)) {
        if (currentValue > previousValue) trend = "up";
        else if (currentValue < previousValue) trend = "down";
      }
      return {
        metricName: m.metric_name,
        currentValue: isNaN(currentValue) ? rawStr : currentValue,
        previousValue,
        trend,
      };
    });
  }

  // Remove internal fields from response
  const { id: _id, company_id: _companyId, companies: _companies, ...rest } = tearSheet;

  return NextResponse.json({
    tearSheet: {
      ...rest,
      companyName: company?.name ?? null,
    },
    metrics,
  });
}

/** Extract the numeric string from a value that may be { raw: "..." } or a primitive. */
function extractValue(v: unknown): string {
  if (v != null && typeof v === "object" && "raw" in v) {
    return String((v as Record<string, unknown>).raw);
  }
  return String(v);
}

function getQuarterDates(quarter: string, year: number) {
  switch (quarter) {
    case "Q1":
      return { periodStart: `${year}-01-01`, periodEnd: `${year}-03-31` };
    case "Q2":
      return { periodStart: `${year}-04-01`, periodEnd: `${year}-06-30` };
    case "Q3":
      return { periodStart: `${year}-07-01`, periodEnd: `${year}-09-30` };
    case "Q4":
      return { periodStart: `${year}-10-01`, periodEnd: `${year}-12-31` };
    default:
      return null;
  }
}

function getPreviousQuarter(quarter: string, year: number) {
  switch (quarter) {
    case "Q1":
      return { quarter: "Q4", year: year - 1 };
    case "Q2":
      return { quarter: "Q1", year };
    case "Q3":
      return { quarter: "Q2", year };
    case "Q4":
      return { quarter: "Q3", year };
    default:
      return null;
  }
}

import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

/** Map quarter to period_start and period_end date strings. */
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

/** Get the previous quarter and year. */
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

// GET - Get metrics for the tear sheet's quarter
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const { id } = await params;

  // Verify tear sheet ownership and get quarter/year
  const { data: tearSheet } = await supabase
    .from("tear_sheets")
    .select("id, company_id, quarter, year")
    .eq("id", id)
    .eq("founder_id", user.id)
    .single();

  if (!tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  const currentDates = getQuarterDates(tearSheet.quarter, tearSheet.year);
  if (!currentDates) return jsonError("Invalid quarter.", 400);

  const prev = getPreviousQuarter(tearSheet.quarter, tearSheet.year);
  const prevDates = prev ? getQuarterDates(prev.quarter, prev.year) : null;

  // Fetch current quarter metrics
  const { data: currentMetrics, error: currentError } = await supabase
    .from("company_metric_values")
    .select("metric_name, value, period_start, period_end, period_type")
    .eq("company_id", tearSheet.company_id)
    .eq("period_start", currentDates.periodStart);

  if (currentError) {
    console.error("Tear sheet metrics error:", currentError);
    return jsonError("Failed to load metrics.", 500);
  }

  // Fetch previous quarter metrics for trend calculation
  let previousMetrics: typeof currentMetrics = [];
  if (prevDates) {
    const { data: prevData, error: prevError } = await supabase
      .from("company_metric_values")
      .select("metric_name, value, period_start, period_end, period_type")
      .eq("company_id", tearSheet.company_id)
      .eq("period_start", prevDates.periodStart);

    if (prevError) {
      console.error("Tear sheet prev metrics error:", prevError);
      return jsonError("Failed to load metrics.", 500);
    }
    previousMetrics = prevData ?? [];
  }

  // Extract the numeric string from the value column, which may be
  // a plain number, a string, or an object like { raw: "85000" }.
  function extractValue(v: unknown): string {
    if (v != null && typeof v === "object" && "raw" in v) {
      return String((v as Record<string, unknown>).raw);
    }
    return String(v);
  }

  // Build a map of previous values by metric name (lowercase for matching)
  const prevMap = new Map<string, number>();
  for (const m of previousMetrics) {
    const val = parseFloat(extractValue(m.value));
    if (!isNaN(val)) {
      prevMap.set(m.metric_name.toLowerCase(), val);
    }
  }

  // Combine current and previous into response with trend info
  const metrics = (currentMetrics ?? []).map((m) => {
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
      periodType: m.period_type,
      periodStart: m.period_start,
      periodEnd: m.period_end,
    };
  });

  return NextResponse.json({ metrics });
}

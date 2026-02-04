import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Deduplicated metric requests for the founder's company
// Groups by metric_name + period, shows requesting investor count
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  // Fetch metric requests without joining metric_definitions.
  // Founders cannot read metric_definitions via RLS (investor-only policy),
  // so we fetch definitions separately using the admin client after
  // verifying company ownership above.
  const { data: requests, error } = await supabase
    .from("metric_requests")
    .select(
      "id, period_start, period_end, status, due_date, created_at, investor_id, metric_definition_id",
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Metric requests fetch error:", error);
    return jsonError("Failed to load requests.", 500);
  }

  const admin = createSupabaseAdminClient();

  // Collect unique definition IDs and investor IDs, look them up with admin
  // client (founders cannot read metric_definitions or other users via RLS).
  const definitionIds = [
    ...new Set((requests ?? []).map((r) => r.metric_definition_id)),
  ];
  const investorIds = [
    ...new Set((requests ?? []).map((r) => r.investor_id)),
  ];

  const defMap = new Map<string, { name: string; period_type: string }>();
  const investorMap = new Map<string, string>(); // id -> display name

  if (definitionIds.length > 0) {
    const { data: defs, error: defError } = await admin
      .from("metric_definitions")
      .select("id, name, period_type")
      .in("id", definitionIds);

    if (defError) {
      console.error("Metric definitions fetch error:", defError);
      return jsonError("Failed to load metric details.", 500);
    }

    for (const d of defs ?? []) {
      defMap.set(d.id, { name: d.name, period_type: d.period_type });
    }
  }

  if (investorIds.length > 0) {
    const { data: investors, error: invError } = await admin
      .from("users")
      .select("id, full_name, email")
      .in("id", investorIds);

    if (invError) {
      console.error("Investor lookup error:", invError);
      // Non-fatal — fall back to "Investor" as display name
    }

    for (const inv of investors ?? []) {
      investorMap.set(inv.id, inv.full_name || inv.email || "Investor");
    }
  }

  // Check which metrics already have submissions using admin client.
  // Match by metric_name + period dates only (not period_type), because the
  // definition's period_type may differ from what was actually submitted.
  const { data: existingValues } = await admin
    .from("company_metric_values")
    .select("metric_name, period_start, period_end")
    .eq("company_id", company.id);

  // Build a lookup of submitted values. We use a two-tier approach:
  // 1. Exact match by name + dates (fast path)
  // 2. Fuzzy match with ±2 day tolerance (handles timezone-shifted dates
  //    from an earlier bug where toISOString() shifted dates to UTC)
  const submittedExact = new Set(
    (existingValues ?? []).map(
      (v) =>
        `${v.metric_name.toLowerCase()}|${v.period_start}|${v.period_end}`,
    ),
  );

  const submittedEntries = (existingValues ?? []).map((v) => ({
    name: v.metric_name.toLowerCase(),
    start: v.period_start,
    end: v.period_end,
  }));

  function datesClose(a: string, b: string, toleranceDays: number): boolean {
    const da = new Date(a).getTime();
    const db = new Date(b).getTime();
    return Math.abs(da - db) <= toleranceDays * 86400000;
  }

  function hasMatchingSubmission(
    metricName: string,
    periodStart: string,
    periodEnd: string,
  ): boolean {
    const exactKey = `${metricName.toLowerCase()}|${periodStart}|${periodEnd}`;
    if (submittedExact.has(exactKey)) return true;
    // Fuzzy match for timezone-shifted dates
    const nameLower = metricName.toLowerCase();
    return submittedEntries.some(
      (e) =>
        e.name === nameLower &&
        datesClose(e.start, periodStart, 2) &&
        datesClose(e.end, periodEnd, 2),
    );
  }

  // Group requests by metric + period
  type GroupedRequest = {
    metricName: string;
    periodType: string;
    periodStart: string;
    periodEnd: string;
    dueDate: string | null;
    status: string;
    investorCount: number;
    investorNames: string[];
    requestIds: string[];
    hasSubmission: boolean;
  };

  const groups = new Map<string, GroupedRequest>();

  for (const req of requests ?? []) {
    const def = defMap.get(req.metric_definition_id);
    if (!def) continue;

    const investorName =
      investorMap.get(req.investor_id) || "Investor";

    const key = `${def.name.toLowerCase()}|${def.period_type}|${req.period_start}|${req.period_end}`;
    const existing = groups.get(key);

    if (existing) {
      existing.investorCount++;
      existing.requestIds.push(req.id);
      if (!existing.investorNames.includes(investorName)) {
        existing.investorNames.push(investorName);
      }
      // Use earliest due date
      if (
        req.due_date &&
        (!existing.dueDate || req.due_date < existing.dueDate)
      ) {
        existing.dueDate = req.due_date;
      }
    } else {
      groups.set(key, {
        metricName: def.name,
        periodType: def.period_type,
        periodStart: req.period_start,
        periodEnd: req.period_end,
        dueDate: req.due_date,
        status: req.status,
        investorCount: 1,
        investorNames: [investorName],
        requestIds: [req.id],
        hasSubmission: hasMatchingSubmission(def.name, req.period_start, req.period_end),
      });
    }
  }

  // Reconcile: find pending requests that have matching submissions and update
  // them to 'submitted'. This fixes stale statuses from when the DB trigger
  // didn't fire (e.g. period_type mismatch between definition and submission).
  const staleIds: string[] = [];
  for (const group of groups.values()) {
    if (group.hasSubmission) {
      for (const id of group.requestIds) {
        // Find the original request to check if it's still marked pending
        const orig = (requests ?? []).find((r) => r.id === id);
        if (orig && orig.status === "pending") {
          staleIds.push(id);
        }
      }
    }
  }

  if (staleIds.length > 0) {
    // Update stale requests — await to ensure the DB is updated before
    // responding (fire-and-forget may not complete in serverless environments)
    const { error: updateError } = await admin
      .from("metric_requests")
      .update({ status: "submitted", updated_at: new Date().toISOString() })
      .in("id", staleIds);

    if (updateError) {
      console.error("Reconcile stale requests error:", updateError);
    }

    // Also update the response data so the founder sees the correct status now
    for (const group of groups.values()) {
      if (group.hasSubmission && group.status === "pending") {
        group.status = "submitted";
      }
    }
  }

  return NextResponse.json({
    companyId: company.id,
    requests: Array.from(groups.values()),
  });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
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
        source,
        source_upload_id,
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
        source,
        source_upload_id,
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

// POST - Add investor-private metrics manually
const postSchema = z.object({
  metrics: z
    .array(
      z.object({
        metric_name: z.string().min(1).max(200),
        value: z.string().min(1),
        period_type: z.enum(["monthly", "quarterly", "annual"]),
        period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        notes: z.string().max(500).optional(),
      }),
    )
    .min(1)
    .max(5),
});

function computePeriodEnd(periodType: string, periodStart: string): string {
  const d = new Date(periodStart + "T00:00:00");
  if (periodType === "monthly") {
    d.setMonth(d.getMonth() + 1);
    d.setDate(d.getDate() - 1);
  } else if (periodType === "quarterly") {
    d.setMonth(d.getMonth() + 3);
    d.setDate(d.getDate() - 1);
  } else {
    // annual
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
  }
  return d.toISOString().slice(0, 10);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Rate limit: 20 manual metric submissions per minute
  const { allowed, retryAfter } = checkRateLimit(`manual-metrics:${user.id}`, 20, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const { id: companyId } = await params;

  // Verify investor has a relationship with this company (any status — investor can pre-load private data)
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const rows = parsed.data.metrics.map((m) => ({
    investor_id: user.id,
    company_id: companyId,
    metric_name: m.metric_name,
    period_type: m.period_type,
    period_start: m.period_start,
    period_end: computePeriodEnd(m.period_type, m.period_start),
    value: { raw: m.value },
    source: "manual" as const,
    notes: m.notes ?? null,
  }));

  const { error } = await supabase
    .from("investor_metric_values")
    .upsert(rows, {
      onConflict: "investor_id,company_id,metric_name,period_type,period_start,period_end",
    });

  if (error) {
    logger.error("Failed to insert manual metrics:", error.message);
    return jsonError("Failed to save metrics.", 500);
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

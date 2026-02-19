import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const bulkSchema = z.object({
  action: z.enum(["approve_all", "reject_all"]),
  filter: z.object({
    companyId: z.string().uuid().optional(),
    minConfidence: z.number().min(0).max(1).optional(),
    periodType: z.enum(["monthly", "quarterly", "annual"]).optional(),
    metricNames: z.array(z.string()).optional(),
  }).optional(),
});

const CHUNK_SIZE = 200;

// POST - Bulk approve/reject values
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const { id: uploadId } = await params;

  // Rate limit: 3 bulk actions/min
  const { allowed, retryAfter } = checkRateLimit(
    `historical-bulk:${user.id}`,
    3,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many bulk actions. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  // Verify ownership
  const { data: upload } = await supabase
    .from("historical_uploads")
    .select("id, user_id, user_role, status")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .single();

  if (!upload) return jsonError("Upload not found.", 404);

  if (!["parsed", "reviewing"].includes(upload.status)) {
    return jsonError("Upload is not available for review.", 400);
  }

  const body = await req.json().catch(() => null);
  const parsed = bulkSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  // Admin client used after ownership verification above
  const admin = createSupabaseAdminClient();

  // Build query for values to process
  let query = admin
    .from("historical_upload_values")
    .select("*")
    .eq("upload_id", uploadId)
    .in("status", ["pending", "conflict"])
    .not("company_id", "is", null);

  const filter = parsed.data.filter;
  if (filter?.companyId) {
    query = query.eq("company_id", filter.companyId);
  }
  if (filter?.minConfidence != null) {
    query = query.gte("ai_confidence", filter.minConfidence);
  }
  if (filter?.periodType) {
    query = query.eq("period_type", filter.periodType);
  }
  if (filter?.metricNames && filter.metricNames.length > 0) {
    query = query.in("metric_name", filter.metricNames);
  }

  const { data: values } = await query;

  if (!values || values.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, approved: 0, rejected: 0 });
  }

  let approvedCount = 0;
  let rejectedCount = 0;

  // Process in chunks
  for (let i = 0; i < values.length; i += CHUNK_SIZE) {
    const chunk = values.slice(i, i + CHUNK_SIZE);

    if (parsed.data.action === "reject_all") {
      const ids = chunk.map((v) => v.id);
      await admin
        .from("historical_upload_values")
        .update({ status: "rejected" })
        .in("id", ids);
      rejectedCount += chunk.length;
      continue;
    }

    // approve_all: batch upsert values into target table
    const rows = chunk.map((valueRow) => {
      const rawValue = valueRow.user_edited_value ?? (valueRow.value as { raw: string })?.raw ?? "0";
      const unit = (valueRow.value as { unit?: string | null })?.unit ?? null;
      const metricName = valueRow.user_edited_metric_name ?? valueRow.metric_name;
      const periodStart = valueRow.user_edited_period_start ?? valueRow.period_start;
      const periodEnd = valueRow.user_edited_period_end ?? valueRow.period_end;
      return { valueRow, rawValue, unit, metricName, periodStart, periodEnd };
    });

    if (role === "founder") {
      const upsertPayload = rows.map((r) => ({
        company_id: r.valueRow.company_id,
        metric_name: r.metricName,
        period_type: r.valueRow.period_type,
        period_start: r.periodStart,
        period_end: r.periodEnd,
        value: { raw: r.rawValue, unit: r.unit },
        submitted_by: user.id,
        source: "historical_upload" as const,
        source_upload_id: uploadId,
      }));

      const { error } = await admin
        .from("company_metric_values")
        .upsert(upsertPayload, {
          onConflict: "company_id,metric_name,period_type,period_start,period_end",
        });

      if (error) {
        logger.error(`[bulk-action] Failed to batch upsert founder values:`, error.message);
      }
    } else {
      const upsertPayload = rows.map((r) => ({
        investor_id: user.id,
        company_id: r.valueRow.company_id,
        metric_name: r.metricName,
        period_type: r.valueRow.period_type,
        period_start: r.periodStart,
        period_end: r.periodEnd,
        value: { raw: r.rawValue, unit: r.unit },
        source: "historical_upload" as const,
        source_upload_id: uploadId,
      }));

      const { error } = await admin
        .from("investor_metric_values")
        .upsert(upsertPayload, {
          onConflict: "investor_id,company_id,metric_name,period_type,period_start,period_end",
        });

      if (error) {
        logger.error(`[bulk-action] Failed to batch upsert investor values:`, error.message);
      }
    }

    // Batch update all chunk statuses to approved
    const chunkIds = chunk.map((v) => v.id);
    await admin
      .from("historical_upload_values")
      .update({ status: "approved" })
      .in("id", chunkIds);

    approvedCount += chunk.length;
  }

  // Update counters and check completion — parallel count queries
  const [
    { count: pendingCount },
    { count: approvedTotal },
    { count: rejectedTotal },
  ] = await Promise.all([
    admin
      .from("historical_upload_values")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", uploadId)
      .in("status", ["pending", "conflict"]),
    admin
      .from("historical_upload_values")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", uploadId)
      .eq("status", "approved"),
    admin
      .from("historical_upload_values")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", uploadId)
      .eq("status", "rejected"),
  ]);

  await admin
    .from("historical_uploads")
    .update({
      status: pendingCount === 0 ? "completed" : "reviewing",
      total_values_approved: approvedTotal ?? 0,
      total_values_rejected: rejectedTotal ?? 0,
    })
    .eq("id", uploadId);

  return NextResponse.json({
    ok: true,
    processed: values.length,
    approved: approvedCount,
    rejected: rejectedCount,
  });
}

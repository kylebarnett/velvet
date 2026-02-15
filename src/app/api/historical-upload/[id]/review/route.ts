import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const reviewSchema = z.object({
  actions: z.array(
    z.object({
      valueId: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      metricName: z.string().optional(),
      value: z.string().optional().refine(
        (v) => v === undefined || !isNaN(Number(v)),
        { message: "Value must be numeric" },
      ),
      periodStart: z.string().optional(),
      periodEnd: z.string().optional(),
    }),
  ).min(1).max(200),
});

// POST - Approve/reject individual values
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const { id: uploadId } = await params;

  // Rate limit: 20 reviews/min
  const { allowed, retryAfter } = checkRateLimit(
    `historical-review:${user.id}`,
    20,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
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
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  // Admin client used after ownership verification above
  const admin = createSupabaseAdminClient();

  // Batch-fetch all target values upfront instead of 1 query per action
  const valueIds = parsed.data.actions.map((a) => a.valueId);
  const { data: allValues } = await admin
    .from("historical_upload_values")
    .select("*")
    .in("id", valueIds)
    .eq("upload_id", uploadId);

  const valueMap = new Map(
    (allValues ?? []).map((v) => [v.id, v])
  );

  // Separate actions into approve and reject groups
  const rejectIds: string[] = [];
  const approveIds: string[] = [];
  const founderUpserts: Array<Record<string, unknown>> = [];
  const investorUpserts: Array<Record<string, unknown>> = [];

  for (const action of parsed.data.actions) {
    const valueRow = valueMap.get(action.valueId);
    if (!valueRow) continue;

    if (action.action === "reject") {
      rejectIds.push(action.valueId);
      continue;
    }

    // Approve: resolve the final values (user edits take priority)
    const finalMetricName = action.metricName ?? valueRow.user_edited_metric_name ?? valueRow.metric_name;
    const finalPeriodStart = action.periodStart ?? valueRow.user_edited_period_start ?? valueRow.period_start;
    const finalPeriodEnd = action.periodEnd ?? valueRow.user_edited_period_end ?? valueRow.period_end;
    const rawValue = action.value ?? valueRow.user_edited_value ?? (valueRow.value as { raw: string })?.raw ?? "0";
    const unit = (valueRow.value as { unit?: string | null })?.unit ?? null;

    if (!valueRow.company_id) {
      logger.warn(`[review] Skipping value ${action.valueId}: no company_id mapped`);
      continue;
    }

    if (role === "founder") {
      founderUpserts.push({
        company_id: valueRow.company_id,
        metric_name: finalMetricName,
        period_type: valueRow.period_type,
        period_start: finalPeriodStart,
        period_end: finalPeriodEnd,
        value: { raw: rawValue, unit },
        submitted_by: user.id,
        source: "historical_upload",
        source_upload_id: uploadId,
      });
    } else {
      investorUpserts.push({
        investor_id: user.id,
        company_id: valueRow.company_id,
        metric_name: finalMetricName,
        period_type: valueRow.period_type,
        period_start: finalPeriodStart,
        period_end: finalPeriodEnd,
        value: { raw: rawValue, unit },
        source: "historical_upload",
        source_upload_id: uploadId,
      });
    }

    approveIds.push(action.valueId);
  }

  let approvedCount = 0;
  let rejectedCount = 0;

  // Batch reject
  if (rejectIds.length > 0) {
    await admin
      .from("historical_upload_values")
      .update({ status: "rejected" })
      .in("id", rejectIds);
    rejectedCount = rejectIds.length;
  }

  // Batch approve: upsert into target table, then update statuses
  if (founderUpserts.length > 0) {
    const { error } = await admin
      .from("company_metric_values")
      .upsert(founderUpserts, {
        onConflict: "company_id,metric_name,period_type,period_start,period_end",
      });
    if (error) {
      logger.error(`[review] Failed to batch upsert founder values:`, error.message);
    }
  }

  if (investorUpserts.length > 0) {
    const { error } = await admin
      .from("investor_metric_values")
      .upsert(investorUpserts, {
        onConflict: "investor_id,company_id,metric_name,period_type,period_start,period_end",
      });
    if (error) {
      logger.error(`[review] Failed to batch upsert investor values:`, error.message);
    }
  }

  if (approveIds.length > 0) {
    await admin
      .from("historical_upload_values")
      .update({ status: "approved" })
      .in("id", approveIds);
    approvedCount = approveIds.length;
  }

  // Check completion — parallel count queries
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

  if (pendingCount === 0) {
    await admin
      .from("historical_uploads")
      .update({
        status: "completed",
        total_values_approved: approvedTotal ?? 0,
        total_values_rejected: rejectedTotal ?? 0,
      })
      .eq("id", uploadId);
  }

  return NextResponse.json({
    ok: true,
    approved: approvedCount,
    rejected: rejectedCount,
  });
}

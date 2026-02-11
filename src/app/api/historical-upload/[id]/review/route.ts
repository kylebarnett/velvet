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
      value: z.string().optional(),
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

  let approvedCount = 0;
  let rejectedCount = 0;

  for (const action of parsed.data.actions) {
    // Fetch the value and verify it belongs to this upload
    const { data: valueRow } = await admin
      .from("historical_upload_values")
      .select("*")
      .eq("id", action.valueId)
      .eq("upload_id", uploadId)
      .single();

    if (!valueRow) continue;

    if (action.action === "reject") {
      await admin
        .from("historical_upload_values")
        .update({ status: "rejected" })
        .eq("id", action.valueId);
      rejectedCount++;
      continue;
    }

    // Approve: resolve the final values (user edits take priority)
    const finalMetricName = action.metricName ?? valueRow.user_edited_metric_name ?? valueRow.metric_name;
    const finalPeriodStart = action.periodStart ?? valueRow.user_edited_period_start ?? valueRow.period_start;
    const finalPeriodEnd = action.periodEnd ?? valueRow.user_edited_period_end ?? valueRow.period_end;
    const rawValue = action.value ?? valueRow.user_edited_value ?? (valueRow.value as { raw: string })?.raw ?? "0";
    const unit = (valueRow.value as { unit?: string | null })?.unit ?? null;

    if (!valueRow.company_id) {
      // Cannot approve without a company mapping
      logger.warn(`[review] Skipping value ${action.valueId}: no company_id mapped`);
      continue;
    }

    if (role === "founder") {
      // Upsert into company_metric_values (shared)
      const { error } = await admin
        .from("company_metric_values")
        .upsert(
          {
            company_id: valueRow.company_id,
            metric_name: finalMetricName,
            period_type: valueRow.period_type,
            period_start: finalPeriodStart,
            period_end: finalPeriodEnd,
            value: { raw: rawValue, unit },
            submitted_by: user.id,
            source: "historical_upload",
            source_upload_id: uploadId,
          },
          {
            onConflict: "company_id,metric_name,period_type,period_start,period_end",
          },
        );

      if (error) {
        logger.error(`[review] Failed to upsert founder value:`, error.message);
        continue;
      }
    } else {
      // Upsert into investor_metric_values (private)
      const { error } = await admin
        .from("investor_metric_values")
        .upsert(
          {
            investor_id: user.id,
            company_id: valueRow.company_id,
            metric_name: finalMetricName,
            period_type: valueRow.period_type,
            period_start: finalPeriodStart,
            period_end: finalPeriodEnd,
            value: { raw: rawValue, unit },
            source: "historical_upload",
            source_upload_id: uploadId,
          },
          {
            onConflict: "investor_id,company_id,metric_name,period_type,period_start,period_end",
          },
        );

      if (error) {
        logger.error(`[review] Failed to upsert investor value:`, error.message);
        continue;
      }
    }

    // Mark the upload value as approved
    await admin
      .from("historical_upload_values")
      .update({ status: "approved" })
      .eq("id", action.valueId);

    approvedCount++;
  }

  // Check if all values are processed — if so, mark as completed
  const { count: pendingCount } = await admin
    .from("historical_upload_values")
    .select("id", { count: "exact", head: true })
    .eq("upload_id", uploadId)
    .in("status", ["pending", "conflict"]);

  if (pendingCount === 0) {
    // Count final approved/rejected
    const { count: approvedTotal } = await admin
      .from("historical_upload_values")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", uploadId)
      .eq("status", "approved");

    const { count: rejectedTotal } = await admin
      .from("historical_upload_values")
      .select("id", { count: "exact", head: true })
      .eq("upload_id", uploadId)
      .eq("status", "rejected");

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

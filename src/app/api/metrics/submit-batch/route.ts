import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const batchSchema = z.object({
  companyId: z.string().uuid(),
  submissions: z
    .array(
      z.object({
        metricName: z.string().min(1),
        periodType: z.enum(["monthly", "quarterly", "annual"]),
        periodStart: z.string().min(1),
        periodEnd: z.string().min(1),
        value: z.string().min(1).refine((v) => !isNaN(Number(v)), { message: "Value must be a number" }),
        notes: z.string().optional(),
        source: z.enum(["manual", "ai_extracted", "override"]).optional(),
        sourceDocumentId: z.string().uuid().optional(),
        changeReason: z.string().optional(),
      }),
    )
    .max(100),
  // Request IDs to mark as fulfilled — passed directly from the UI
  // which knows exactly which requests are being addressed.
  fulfillRequestIds: z.array(z.string().uuid()).optional(),
}).refine(
  (data) => data.submissions.length > 0 || (data.fulfillRequestIds && data.fulfillRequestIds.length > 0),
  { message: "At least one submission or request ID is required" },
);

export async function POST(req: Request) {
  const parsed = batchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  // Rate limit: 10 batch submissions per minute per user
  const { allowed, retryAfter } = checkRateLimit(`submit-batch:${user.id}`, 10, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const { companyId, submissions, fulfillRequestIds } = parsed.data;

  // Verify the founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized for this company.", 403);

  const errors: string[] = [];
  const now = new Date().toISOString();
  let submitted = 0;

  // Only upsert when there are actual value submissions
  if (submissions.length > 0) {
    // Build all rows at once for a single batch upsert (1 round-trip instead of N)
    const rows = submissions.map((sub) => ({
      company_id: companyId,
      metric_name: sub.metricName,
      period_type: sub.periodType,
      period_start: sub.periodStart,
      period_end: sub.periodEnd,
      value: { raw: sub.value },
      notes: sub.notes || null,
      submitted_by: user.id,
      source: sub.source ?? "manual",
      source_document_id: sub.sourceDocumentId ?? null,
      submitted_at: now,
    }));

    const { error: upsertError } = await supabase
      .from("company_metric_values")
      .upsert(rows, {
        onConflict: "company_id,metric_name,period_type,period_start,period_end",
      });

    if (upsertError) {
      errors.push(`Batch upsert failed: ${upsertError.message}`);
    } else {
      submitted = submissions.length;
    }
  }

  // Fulfill matching metric requests — runs regardless of whether values
  // were submitted, so founders can mark a period as "complete" even with
  // no new values (partial submission = complete).
  try {
    const admin = createSupabaseAdminClient();

    if (fulfillRequestIds && fulfillRequestIds.length > 0) {
      // Directly mark the specified requests as fulfilled.
      // The UI passes the exact request IDs that correspond to the submitted
      // metrics, so no fragile name/date matching is needed.
      // Verify these requests belong to this company before updating.
      const { data: validRequests } = await admin
        .from("metric_requests")
        .select("id")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .in("id", fulfillRequestIds);

      const validIds = (validRequests ?? []).map((r) => r.id);

      if (validIds.length > 0) {
        const { error: updateError } = await admin
          .from("metric_requests")
          .update({
            status: "submitted",
            updated_at: now,
          })
          .in("id", validIds);

        if (updateError) {
          logger.error("Failed to fulfill requests:", updateError);
        }
      }
    } else if (submissions.length > 0 && submitted > 0) {
      // Batch fulfill by matching metric name + period in a single query.
      // Only run this fallback when there are actual submissions to match.
      const metricNames = submissions.map((s) => s.metricName.toLowerCase());

      const { data: matchingRequests } = await admin
        .from("metric_requests")
        .select("id, metric_name, period_start, period_end, period_type")
        .eq("company_id", companyId)
        .eq("status", "pending")
        .in("metric_name", metricNames);

      if (matchingRequests && matchingRequests.length > 0) {
        // Build a lookup set of submitted metric keys for O(1) matching
        const submittedKeys = new Set(
          submissions.map(
            (s) =>
              `${s.metricName.toLowerCase()}|${s.periodType}|${s.periodStart}|${s.periodEnd}`,
          ),
        );

        const idsToFulfill = matchingRequests
          .filter((r) => {
            const key = `${(r.metric_name ?? "").toLowerCase()}|${r.period_type}|${r.period_start}|${r.period_end}`;
            return submittedKeys.has(key);
          })
          .map((r) => r.id);

        if (idsToFulfill.length > 0) {
          const { error: updateError } = await admin
            .from("metric_requests")
            .update({
              status: "submitted",
              updated_at: now,
            })
            .in("id", idsToFulfill);

          if (updateError) {
            logger.error("Failed to fulfill requests:", updateError);
          }
        }
      }
    }
  } catch (e: unknown) {
    // Non-fatal — the metric values were submitted successfully
    logger.error("Failed to auto-fulfill requests:", e);
  }

  return NextResponse.json({
    submitted,
    failed: errors.length,
    errors,
  });
}

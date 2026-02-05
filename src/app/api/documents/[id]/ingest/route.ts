import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createExtractor } from "@/lib/ai/extractor";
import { normalizeMetricPeriods } from "@/lib/utils/period-normalization";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = user.user_metadata?.role as string | undefined;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Verify founder owns the document's company
  const { data: doc } = await supabase
    .from("documents")
    .select("company_id, file_path, file_type, file_name, ingestion_status")
    .eq("id", id)
    .single();

  if (!doc) return jsonError("Document not found.", 404);

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", doc.company_id)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized to access this document.", 403);

  const admin = createSupabaseAdminClient();

  // Atomically set status to "processing" only if not already processing.
  // This prevents concurrent requests from both starting extraction.
  const { data: updated, error: updateError } = await admin
    .from("documents")
    .update({ ingestion_status: "processing" })
    .eq("id", id)
    .neq("ingestion_status", "processing")
    .select("id")
    .maybeSingle();

  if (updateError) return jsonError(updateError.message, 400);
  if (!updated) {
    return jsonError("Document is already being processed.", 409);
  }

  try {
    // Download file from storage
    const { data: fileData, error: downloadError } = await admin.storage
      .from("documents")
      .download(doc.file_path);

    if (downloadError || !fileData) {
      throw new Error("Failed to download document from storage.");
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const mimeType = doc.file_type || "application/pdf";

    // Gather target metrics: existing company_metric_values + pending metric_requests
    const [{ data: existingValues }, { data: pendingRequests }] = await Promise.all([
      admin
        .from("company_metric_values")
        .select("metric_name")
        .eq("company_id", doc.company_id),
      admin
        .from("metric_requests")
        .select("metric_name")
        .eq("company_id", doc.company_id)
        .in("status", ["pending", "sent"]),
    ]);

    const metricNames = new Set<string>();
    for (const row of existingValues ?? []) {
      if (row.metric_name) metricNames.add(row.metric_name);
    }
    for (const row of pendingRequests ?? []) {
      if (row.metric_name) metricNames.add(row.metric_name);
    }

    const targetMetrics = Array.from(metricNames);

    // Run AI extraction
    const extractor = createExtractor();
    const result = await extractor.extract(buffer, mimeType, doc.file_name, targetMetrics.length > 0 ? targetMetrics : undefined);

    // Store extracted_data on the document
    await admin
      .from("documents")
      .update({
        extracted_data: result,
        ingestion_status: "completed",
      })
      .eq("id", id);

    // Normalize periods before storing to ensure consistent alignment
    // This fixes AI extraction quirks (e.g., returning Sep 30 for Q4 instead of Oct 1)
    const normalizedMetrics = normalizeMetricPeriods(result.metrics);

    const adjustedCount = normalizedMetrics.filter(
      (m) => m.period_was_adjusted,
    ).length;
    // Create document_metric_mappings rows for each extracted metric
    if (normalizedMetrics.length > 0) {
      const mappings = normalizedMetrics.map((m) => ({
        document_id: id,
        metric_request_id: null,
        metric_value_id: null,
        confidence_score: m.confidence,
        extracted_metric_name: m.name,
        extracted_value: { raw: String(m.value), unit: m.unit },
        extracted_period_start: m.period_start,
        extracted_period_end: m.period_end,
        extracted_period_type: m.period_type,
        status: "pending",
      }));

      await admin.from("document_metric_mappings").insert(mappings);
    }

    return NextResponse.json({
      ok: true,
      metricsFound: normalizedMetrics.length,
      periodsAdjusted: adjustedCount,
      processingTimeMs: result.processing_time_ms,
    });
  } catch (err) {
    // Mark as failed on error
    await admin
      .from("documents")
      .update({ ingestion_status: "failed" })
      .eq("id", id);

    const message = err instanceof Error ? err.message : "Extraction failed.";
    console.error("[ingest] Extraction error:", message);
    return jsonError(message, 500);
  }
}

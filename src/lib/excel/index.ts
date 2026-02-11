import type { SupabaseClient } from "@supabase/supabase-js";
import { logger } from "@/lib/logger";
import { parseExcelBuffer } from "./parser";
import { analyzeWorkbook } from "./ai-analyzer";
import { mapCompaniesForInvestor, mapCompanyForFounder } from "./company-mapper";
import { detectFounderConflicts, detectInvestorConflicts } from "./conflict-detector";
import type {
  UploadValueInsert,
  ProcessingResult,
  CompanyMatch,
} from "./types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const BATCH_SIZE = 500;

/**
 * Full pipeline: parse → AI analyze → normalize → map companies → detect conflicts → store.
 *
 * Returns the upload ID and summary stats.
 */
export async function processExcelUpload(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  userId: string,
  userRole: "investor" | "founder",
  supabase: SupabaseClient,
  organizationId?: string | null,
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Admin client used AFTER ownership already verified by the caller API route
  const admin = createSupabaseAdminClient();

  // 1. Create upload record
  const { data: upload, error: uploadError } = await admin
    .from("historical_uploads")
    .insert({
      user_id: userId,
      user_role: userRole,
      organization_id: organizationId ?? null,
      file_name: fileName,
      file_path: `${userId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`,
      file_size: buffer.byteLength,
      file_type: mimeType,
      status: "processing",
    })
    .select("id, file_path")
    .single();

  if (uploadError || !upload) {
    throw new Error("Failed to create upload record.");
  }

  const uploadId = upload.id;

  try {
    // 2. Upload file to storage
    const { error: storageError } = await admin.storage
      .from("historical-uploads")
      .upload(upload.file_path, buffer, {
        contentType: mimeType,
        upsert: false,
      });

    if (storageError) {
      logger.error("[excel-pipeline] Storage upload failed:", storageError.message);
      throw new Error("Failed to store the uploaded file.");
    }

    // 3. Parse Excel file
    const workbook = parseExcelBuffer(buffer, mimeType, fileName);

    // 4. AI structure analysis + value extraction
    const analysis = await analyzeWorkbook(workbook);

    // 5. Map companies
    let companyMappings: CompanyMatch[] = [];
    let founderCompanyId: string | null = null;

    if (userRole === "investor") {
      companyMappings = await mapCompaniesForInvestor(
        supabase,
        userId,
        analysis.companiesDetected,
      );
    } else {
      const founderCompany = await mapCompanyForFounder(supabase, userId);
      if (founderCompany) {
        founderCompanyId = founderCompany.companyId;
      }
    }

    // 6. Build value inserts
    const valueInserts: UploadValueInsert[] = analysis.values
      .filter((v) => v.numericValue !== null && v.metricName)
      .map((v) => {
        // Resolve company_id
        let companyId: string | null = null;
        if (userRole === "founder") {
          companyId = founderCompanyId;
        } else if (v.companyName) {
          const mapping = companyMappings.find(
            (m) => m.detectedName === v.companyName && m.autoMatched,
          );
          companyId = mapping?.companyId ?? null;
        }

        return {
          upload_id: uploadId,
          company_id: companyId,
          company_name_detected: v.companyName,
          metric_name: v.metricName,
          period_type: v.periodType,
          period_start: v.periodStart,
          period_end: v.periodEnd,
          value: { raw: String(v.numericValue), unit: v.unit },
          ai_confidence: v.confidence,
          sheet_name: v.sheetName,
          cell_reference: v.cellReference,
          status: "pending" as const,
          conflict_type: null,
          conflict_existing_value: null,
        };
      });

    if (valueInserts.length === 0) {
      // Mark as parsed with 0 values
      await admin
        .from("historical_uploads")
        .update({
          status: "parsed",
          ai_provider: analysis.provider,
          ai_model: analysis.model,
          parsing_time_ms: Date.now() - startTime,
          total_values_detected: 0,
        })
        .eq("id", uploadId);

      return {
        uploadId,
        totalValues: 0,
        companiesDetected: analysis.companiesDetected,
        conflicts: 0,
        aiProvider: analysis.provider,
        aiModel: analysis.model,
        parsingTimeMs: Date.now() - startTime,
      };
    }

    // 7. Detect conflicts
    let conflicts: Map<number, { type: string }>;
    if (userRole === "founder") {
      conflicts = await detectFounderConflicts(supabase, valueInserts);
    } else {
      conflicts = await detectInvestorConflicts(supabase, userId, valueInserts);
    }

    // Apply conflict info
    for (const [idx, conflict] of conflicts) {
      valueInserts[idx].status = "conflict";
      valueInserts[idx].conflict_type = conflict.type;
    }

    // 8. Batch insert values
    for (let i = 0; i < valueInserts.length; i += BATCH_SIZE) {
      const batch = valueInserts.slice(i, i + BATCH_SIZE);
      const { error: insertError } = await admin
        .from("historical_upload_values")
        .insert(batch);

      if (insertError) {
        logger.error(`[excel-pipeline] Batch insert error at offset ${i}:`, insertError.message);
        throw new Error("Failed to store parsed values.");
      }
    }

    // 9. Update upload record
    const parsingTimeMs = Date.now() - startTime;
    await admin
      .from("historical_uploads")
      .update({
        status: "parsed",
        ai_provider: analysis.provider,
        ai_model: analysis.model,
        parsing_time_ms: parsingTimeMs,
        total_values_detected: valueInserts.length,
      })
      .eq("id", uploadId);

    logger.info(
      `[excel-pipeline] Upload ${uploadId} complete: ${valueInserts.length} values, ` +
      `${conflicts.size} conflicts, ${parsingTimeMs}ms`,
    );

    return {
      uploadId,
      totalValues: valueInserts.length,
      companiesDetected: analysis.companiesDetected,
      conflicts: conflicts.size,
      aiProvider: analysis.provider,
      aiModel: analysis.model,
      parsingTimeMs,
    };
  } catch (err: unknown) {
    // Mark upload as failed
    const msg = err instanceof Error ? err.message : "Unknown error";
    await admin
      .from("historical_uploads")
      .update({
        status: "failed",
        error_message: msg,
        parsing_time_ms: Date.now() - startTime,
      })
      .eq("id", uploadId);

    throw err;
  }
}

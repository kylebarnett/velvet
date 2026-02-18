import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { detectFounderConflicts, detectInvestorConflicts } from "@/lib/excel/conflict-detector";
import { logger } from "@/lib/logger";

const mappingSchema = z.object({
  mappings: z.array(
    z.object({
      detectedName: z.string().min(1),
      companyId: z.string().uuid().nullable(),
      createNew: z.boolean().optional().default(false),
    }),
  ).min(1).max(500),
});

// PATCH - Confirm/correct company mappings for detected names
export async function PATCH(
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

  // Verify ownership
  const { data: upload } = await supabase
    .from("historical_uploads")
    .select("id, user_id, status")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .single();

  if (!upload) return jsonError("Upload not found.", 404);

  if (upload.status !== "parsed" && upload.status !== "reviewing") {
    return jsonError("Upload is not in a state that allows mapping changes.", 400);
  }

  // Validate body
  const body = await req.json().catch(() => null);
  const parsed = mappingSchema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  // Admin client used after ownership verification above
  const admin = createSupabaseAdminClient();

  // Process createNew entries first: create companies + investor relationships
  for (const mapping of parsed.data.mappings) {
    if (!mapping.createNew) continue;

    // Create a new company record with the detected name
    const { data: newCompany, error: createErr } = await admin
      .from("companies")
      .insert({ name: mapping.detectedName })
      .select("id")
      .single();

    if (createErr || !newCompany) {
      logger.error(`[company-mapping] Failed to create company "${mapping.detectedName}":`, createErr?.message);
      return jsonError(`Failed to create company "${mapping.detectedName}".`, 500);
    }

    // Create investor-company relationship (auto-approved since investor is creating it)
    if (role === "investor") {
      const { error: relErr } = await admin
        .from("investor_company_relationships")
        .insert({
          investor_id: user.id,
          company_id: newCompany.id,
          approval_status: "auto_approved",
        });

      if (relErr) {
        // Rollback: delete the company we just created
        await admin.from("companies").delete().eq("id", newCompany.id);
        logger.error(`[company-mapping] Failed to create relationship for "${mapping.detectedName}":`, relErr.message);
        return jsonError(`Failed to create company relationship for "${mapping.detectedName}".`, 500);
      }
    }

    // Update the mapping object with the new company ID so the loop below works
    mapping.companyId = newCompany.id;
    logger.info(`[company-mapping] Created new company "${mapping.detectedName}" with id ${newCompany.id}`);
  }

  // Apply each mapping
  for (const mapping of parsed.data.mappings) {
    await admin
      .from("historical_upload_values")
      .update({ company_id: mapping.companyId })
      .eq("upload_id", uploadId)
      .eq("company_name_detected", mapping.detectedName);
  }

  // Re-run conflict detection after mapping changes
  const { data: allValues } = await admin
    .from("historical_upload_values")
    .select("id, upload_id, company_id, company_name_detected, metric_name, period_type, period_start, period_end, value, ai_confidence, sheet_name, cell_reference, status")
    .eq("upload_id", uploadId)
    .not("company_id", "is", null);

  if (allValues && allValues.length > 0) {
    // Reset conflict status before re-detecting
    await admin
      .from("historical_upload_values")
      .update({ status: "pending", conflict_type: null, conflict_existing_value: null })
      .eq("upload_id", uploadId)
      .in("status", ["conflict", "pending"]);

    const valueInserts = allValues.map((v) => ({
      upload_id: v.upload_id,
      company_id: v.company_id,
      company_name_detected: v.company_name_detected,
      metric_name: v.metric_name,
      period_type: v.period_type,
      period_start: v.period_start,
      period_end: v.period_end,
      value: v.value as { raw: string; unit: string | null },
      ai_confidence: v.ai_confidence ?? 0.85,
      sheet_name: v.sheet_name ?? "",
      cell_reference: v.cell_reference ?? "",
      status: "pending" as const,
      conflict_type: null,
      conflict_existing_value: null,
    }));

    let conflicts: Map<number, { type: string }>;
    if (role === "founder") {
      conflicts = await detectFounderConflicts(supabase, valueInserts);
    } else {
      conflicts = await detectInvestorConflicts(supabase, user.id, valueInserts);
    }

    // Apply conflicts
    for (const [idx, conflict] of conflicts) {
      const value = allValues[idx];
      if (value) {
        await admin
          .from("historical_upload_values")
          .update({
            status: "conflict",
            conflict_type: conflict.type,
          })
          .eq("id", value.id);
      }
    }
  }

  // Update upload status to reviewing
  await admin
    .from("historical_uploads")
    .update({ status: "reviewing" })
    .eq("id", uploadId);

  return NextResponse.json({ ok: true });
}

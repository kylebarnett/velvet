import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = (user.user_metadata?.role as string | undefined) ?? null;
  if (role !== "founder") return jsonError("Forbidden", 403);

  const form = await req.formData().catch(() => null);
  if (!form) return jsonError("Invalid form data.", 400);

  const file = form.get("file");
  if (!(file instanceof File)) return jsonError("Missing file.", 400);

  // Validate file type - only allow safe document and image formats
  const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
    "image/png",
    "image/jpeg",
    "image/webp",
  ]);
  if (!allowedMimeTypes.has(file.type)) {
    return jsonError(
      "Unsupported file type. Allowed: PDF, Excel, CSV, PNG, JPG, WebP.",
      400,
    );
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024;
  if (file.size > maxSize) {
    return jsonError("File too large. Maximum size is 50MB.", 400);
  }

  const companyId = form.get("companyId");
  if (typeof companyId !== "string" || !companyId) {
    return jsonError("Missing companyId.", 400);
  }

  // Validate UUID format to reject malformed IDs early
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(companyId)) {
    return jsonError("Invalid companyId format.", 400);
  }

  // Get document type (required)
  const documentType = form.get("documentType");
  if (typeof documentType !== "string" || !documentType) {
    return jsonError("Missing documentType.", 400);
  }

  // Validate document type is a valid enum value
  const validTypes = [
    "income_statement",
    "balance_sheet",
    "cash_flow_statement",
    "consolidated_financial_statements",
    "409a_valuation",
    "investor_update",
    "board_deck",
    "cap_table",
    "other",
  ];
  if (!validTypes.includes(documentType)) {
    return jsonError("Invalid documentType.", 400);
  }

  // Get period label (e.g. "Q1 2026")
  const periodLabelRaw = form.get("periodLabel");
  const periodLabel =
    typeof periodLabelRaw === "string" && periodLabelRaw.trim()
      ? periodLabelRaw.trim()
      : null;

  // Get optional description
  const descriptionRaw = form.get("description");
  const description =
    typeof descriptionRaw === "string" && descriptionRaw.trim()
      ? descriptionRaw.trim()
      : null;

  // Verify founder owns this company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", companyId)
    .eq("founder_id", user.id)
    .single();

  if (!company) {
    return jsonError("Not authorized to upload to this company.", 403);
  }

  // Sanitize filename to prevent path traversal attacks
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const filePath = `${companyId}/${Date.now()}-${sanitizedName}`;

  // Ensure the storage bucket exists (uses admin client to create if missing)
  const admin = createSupabaseAdminClient();
  const { data: buckets } = await admin.storage.listBuckets();
  if (!buckets?.some((b) => b.name === "documents")) {
    await admin.storage.createBucket("documents", { public: false });
  }

  // Use admin client for storage upload — ownership verified above
  const { error: uploadError } = await admin.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) return jsonError(uploadError.message, 400);

  // Use admin client to insert the document record — ownership already
  // verified above, and the founder's client may be blocked by RLS if
  // current_user_role() doesn't resolve correctly.
  const { data: doc, error: docErr } = await admin
    .from("documents")
    .insert({
      company_id: companyId,
      uploaded_by: user.id,
      file_name: sanitizedName,
      file_path: filePath,
      file_type: file.type || null,
      file_size: file.size,
      document_type: documentType,
      description: description,
      period_label: periodLabel,
      ingestion_status: "pending",
    })
    .select("id")
    .single();

  if (docErr) return jsonError(docErr.message, 400);

  // TODO: queue ingestion (Edge Function) for AI extraction.

  return NextResponse.json({ id: doc.id });
}


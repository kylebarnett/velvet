import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { processExcelUpload } from "@/lib/excel";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/excel/types";

export const runtime = "nodejs";
export const maxDuration = 60;

// POST - Upload an Excel/CSV file and initiate AI parsing
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  // Rate limit: 5 uploads per minute per user
  const { allowed, retryAfter } = checkRateLimit(
    `historical-upload:${user.id}`,
    5,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many uploads. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  // Parse multipart form data
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError("Invalid form data.", 400);
  }

  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return jsonError("No file provided.", 400);
  }

  // MIME type check
  const mimeType = file.type;
  if (!ALLOWED_MIME_TYPES.includes(mimeType as (typeof ALLOWED_MIME_TYPES)[number])) {
    return jsonError("Invalid file type. Only .xlsx, .xls, and .csv files are accepted.", 400);
  }

  // File size check
  if (file.size > MAX_FILE_SIZE) {
    return jsonError(`File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`, 400);
  }

  if (file.size === 0) {
    return jsonError("File is empty.", 400);
  }

  // Sanitize filename
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Read file buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Get organization_id if investor belongs to one
  let organizationId: string | null = null;
  if (role === "investor") {
    const { data: orgMember } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("user_id", user.id)
      .maybeSingle();
    organizationId = orgMember?.organization_id ?? null;
  }

  try {
    const result = await processExcelUpload(
      buffer,
      mimeType,
      sanitizedName,
      user.id,
      role,
      supabase,
      organizationId,
    );

    return NextResponse.json({
      ok: true,
      uploadId: result.uploadId,
      totalValues: result.totalValues,
      companiesDetected: result.companiesDetected,
      conflicts: result.conflicts,
      aiProvider: result.aiProvider,
      parsingTimeMs: result.parsingTimeMs,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Upload processing failed.";
    // Return user-friendly message without leaking internals
    if (msg.includes("password-protected") || msg.includes("no data") || msg.includes("no sheets") || msg.includes("maximum")) {
      return jsonError(msg, 400);
    }
    return jsonError("Failed to process the uploaded file. Please try again.", 500);
  }
}

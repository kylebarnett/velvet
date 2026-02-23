import crypto from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";

// Note: SVG intentionally excluded — can contain embedded JavaScript (XSS risk)
const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

// SVG extensions to block even if MIME type is spoofed
const BLOCKED_EXTENSIONS = new Set(["svg", "svgz"]);

const MAX_SIZE = 10_485_760; // 10 MB

const conversationIdSchema = z.string().uuid("Invalid conversation ID.");

// ---------------------------------------------------------------------------
// POST /api/chat/upload — Upload a file attachment for a chat message
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Pre-check content-length before reading into memory
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 10 MB.", 413);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const conversationId = formData.get("conversationId") as string | null;

  if (!file) return jsonError("No file provided.", 400);
  if (!conversationId) {
    return jsonError("conversationId is required.", 400);
  }

  // Validate conversationId is a UUID
  const parsedConvoId = conversationIdSchema.safeParse(conversationId);
  if (!parsedConvoId.success) {
    return jsonError("Invalid conversation ID.", 400);
  }

  // Verify user is active participant in the conversation
  const isParticipant = await isActiveParticipant(
    supabase,
    conversationId,
    user.id,
  );
  if (!isParticipant) return jsonError("Forbidden.", 403);

  // Security: check file extension for SVG
  const fileExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (BLOCKED_EXTENSIONS.has(fileExt)) {
    return jsonError("SVG files are not allowed.", 400);
  }

  // Security: check MIME type
  if (!ALLOWED_TYPES.has(file.type)) {
    return jsonError(
      "Invalid file type. Allowed: PNG, JPG, WebP, PDF, Word, Excel, CSV, TXT.",
      400,
    );
  }

  // Security: check file size
  if (file.size > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 10 MB.", 400);
  }

  // Sanitize filename
  const sanitizedFilename = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Get user's investor org ID
  const { data: membership } = await supabase
    .from("organization_members")
    .select("organization_id, organizations!inner(id, org_type)")
    .eq("user_id", user.id)
    .limit(100);

  const investorMembership = (membership ?? []).find((m) => {
    const org = Array.isArray(m.organizations)
      ? m.organizations[0]
      : m.organizations;
    return org?.org_type === "investor";
  });

  if (!investorMembership) {
    return jsonError("No investor organization found.", 404);
  }

  const orgId = investorMembership.organization_id;

  // Upload to Supabase Storage
  const storagePath = `${orgId}/${conversationId}/${crypto.randomUUID()}_${sanitizedFilename}`;

  const { error: uploadError } = await supabase.storage
    .from("chat-files")
    .upload(storagePath, file, {
      contentType: file.type,
    });

  if (uploadError) {
    return jsonError("Failed to upload file.", 500);
  }

  // Get public URL
  const { data: urlData } = supabase.storage
    .from("chat-files")
    .getPublicUrl(storagePath);

  return NextResponse.json(
    {
      url: urlData.publicUrl,
      fileName: sanitizedFilename,
      fileSize: file.size,
      ok: true,
    },
    { status: 201 },
  );
}

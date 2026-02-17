import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Note: SVG intentionally excluded - can contain embedded JavaScript (XSS risk)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST - Upload logo for an organization
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify admin role in org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return jsonError("Only admins can update the organization logo.", 403);
  }

  // Pre-check content-length header before reading into memory
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 413);
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return jsonError("No file provided.", 400);

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonError("Invalid file type. Allowed: PNG, JPG, WebP.", 400);
  }

  if (file.size > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 400);
  }

  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = extMap[file.type] || "png";
  const filePath = `org/${id}.${ext}`;

  // Upload to Supabase Storage (reusing company-logos bucket)
  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    logger.error("Org logo upload error:", uploadError);
    return jsonError("Failed to upload logo.", 500);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from("company-logos")
    .getPublicUrl(filePath);

  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update organization with logo URL — admin client needed because
  // the organizations table may not have an UPDATE RLS policy for members
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("organizations")
    .update({ logo_url: logoUrl, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    logger.error("Org logo update error:", updateError);
    return jsonError("Failed to save logo URL.", 500);
  }

  return NextResponse.json({ logoUrl, ok: true });
}

// DELETE - Remove organization logo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify admin role in org
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return jsonError("Only admins can remove the organization logo.", 403);
  }

  // Get current logo URL to delete from storage
  const { data: org } = await supabase
    .from("organizations")
    .select("logo_url")
    .eq("id", id)
    .single();

  if (org?.logo_url) {
    const urlParts = org.logo_url.split("/company-logos/");
    if (urlParts[1]) {
      const pathWithoutQuery = urlParts[1].split("?")[0];
      await supabase.storage.from("company-logos").remove([pathWithoutQuery]);
    }
  }

  // Clear logo_url — admin client needed for same reason as POST
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("organizations")
    .update({ logo_url: null, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    logger.error("Org logo remove error:", updateError);
    return jsonError("Failed to remove logo.", 500);
  }

  return NextResponse.json({ ok: true });
}

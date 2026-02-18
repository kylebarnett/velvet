import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// Note: SVG intentionally excluded — can contain embedded JavaScript (XSS risk)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST — Upload avatar for the authenticated user
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Rate limit: 5 uploads per minute per user
  const { allowed, retryAfter } = checkRateLimit(
    `avatar-upload:${user.id}`,
    5,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
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
  // Path format: {userId}/avatar.{ext} — matches existing RLS policy
  // where first folder = auth.uid()
  const filePath = `${user.id}/avatar.${ext}`;

  // Upload to Supabase Storage (reusing company-logos bucket)
  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    logger.error("Avatar upload error:", uploadError);
    return jsonError("Failed to upload avatar.", 500);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from("company-logos")
    .getPublicUrl(filePath);

  const avatarUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update users.avatar_url — admin client needed because users table
  // may not have UPDATE RLS for all columns
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("users")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    logger.error("Avatar URL update error:", updateError);
    return jsonError("Failed to save avatar URL.", 500);
  }

  // Also update auth.user_metadata.avatar_url for session access
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: avatarUrl },
  });

  if (metaError) {
    logger.error("Avatar metadata update error:", metaError);
    // Non-fatal: the users table is already updated
  }

  return NextResponse.json({ avatarUrl, ok: true });
}

// DELETE — Remove avatar for the authenticated user
export async function DELETE() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Get current avatar_url to delete from storage
  const { data: userData } = await supabase
    .from("users")
    .select("avatar_url")
    .eq("id", user.id)
    .single();

  if (userData?.avatar_url) {
    const urlParts = userData.avatar_url.split("/company-logos/");
    if (urlParts[1]) {
      const pathWithoutQuery = urlParts[1].split("?")[0];
      await supabase.storage.from("company-logos").remove([pathWithoutQuery]);
    }
  }

  // Clear avatar_url — admin client needed for same reason as POST
  const admin = createSupabaseAdminClient();
  const { error: updateError } = await admin
    .from("users")
    .update({ avatar_url: null, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    logger.error("Avatar remove error:", updateError);
    return jsonError("Failed to remove avatar.", 500);
  }

  // Clear auth.user_metadata.avatar_url
  const { error: metaError } = await admin.auth.admin.updateUserById(user.id, {
    user_metadata: { ...user.user_metadata, avatar_url: null },
  });

  if (metaError) {
    logger.error("Avatar metadata clear error:", metaError);
    // Non-fatal: the users table is already updated
  }

  return NextResponse.json({ ok: true });
}

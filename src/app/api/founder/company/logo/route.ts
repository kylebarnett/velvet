import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

// Note: SVG intentionally excluded - can contain embedded JavaScript (XSS risk)
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST - Upload logo for the founder's company
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  // Pre-check content-length header before reading into memory
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 413);
  }

  // Verify founder owns a company
  const { data: company, error: compError } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (compError || !company) {
    return jsonError("No company found.", 404);
  }

  // Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return jsonError("No file provided.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonError("Invalid file type. Allowed: PNG, JPG, WebP.", 400);
  }

  if (file.size > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 400);
  }

  // Get file extension from type
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
  };
  const ext = extMap[file.type] || "png";
  const filePath = `founder/${company.id}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    logger.error("Upload error:", uploadError);
    return jsonError("Failed to upload logo.", 500);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from("company-logos")
    .getPublicUrl(filePath);

  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update company with logo URL
  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: logoUrl })
    .eq("id", company.id);

  if (updateError) {
    logger.error("Update error:", updateError);
    return jsonError("Failed to save logo URL.", 500);
  }

  // Revalidate pages that show the company logo
  revalidatePath("/portal");
  revalidatePath("/portal/company");

  return NextResponse.json({ logoUrl, ok: true });
}

// DELETE - Remove company logo
export async function DELETE() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Forbidden.", 403);

  // Verify founder owns a company
  const { data: company, error: compError } = await supabase
    .from("companies")
    .select("id, logo_url")
    .eq("founder_id", user.id)
    .single();

  if (compError || !company) {
    return jsonError("No company found.", 404);
  }

  // Delete from storage if there's an existing logo
  if (company.logo_url) {
    const urlParts = company.logo_url.split("/company-logos/");
    if (urlParts[1]) {
      const pathWithoutQuery = urlParts[1].split("?")[0];
      await supabase.storage.from("company-logos").remove([pathWithoutQuery]);
    }
  }

  // Clear logo_url in database
  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: null })
    .eq("id", company.id);

  if (updateError) {
    logger.error("Update error:", updateError);
    return jsonError("Failed to remove logo.", 500);
  }

  // Revalidate pages that show the company logo
  revalidatePath("/portal");
  revalidatePath("/portal/company");

  return NextResponse.json({ ok: true });
}

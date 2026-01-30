import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

import { getApiUser, jsonError } from "@/lib/api/auth";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];
const MAX_SIZE = 2 * 1024 * 1024; // 2MB

// POST - Upload logo for a company
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Pre-check content-length header before reading into memory
  const contentLength = parseInt(req.headers.get("content-length") || "0", 10);
  if (contentLength > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 413);
  }

  // Verify investor owns this company relationship
  const { data: relationship, error: relError } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (relError || !relationship) {
    return jsonError("Company not in portfolio.", 403);
  }

  // Parse form data
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return jsonError("No file provided.", 400);
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return jsonError("Invalid file type. Allowed: PNG, JPG, WebP, SVG.", 400);
  }

  if (file.size > MAX_SIZE) {
    return jsonError("File too large. Maximum size: 2MB.", 400);
  }

  // Get file extension from type
  const extMap: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/svg+xml": "svg",
  };
  const ext = extMap[file.type] || "png";
  const filePath = `${user.id}/${companyId}.${ext}`;

  // Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage
    .from("company-logos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadError) {
    console.error("Upload error:", uploadError);
    return jsonError("Failed to upload logo.", 500);
  }

  // Get public URL with cache-busting timestamp
  const { data: urlData } = supabase.storage
    .from("company-logos")
    .getPublicUrl(filePath);

  // Add timestamp to bust browser/CDN cache when logo is updated
  const logoUrl = `${urlData.publicUrl}?v=${Date.now()}`;

  // Update relationship with logo URL
  const { error: updateError } = await supabase
    .from("investor_company_relationships")
    .update({ logo_url: logoUrl })
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("Update error:", updateError);
    return jsonError("Failed to save logo URL.", 500);
  }

  // Revalidate pages that show company logos
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");

  return NextResponse.json({ logoUrl, ok: true });
}

// DELETE - Remove custom logo
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: companyId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Verify investor owns this company relationship
  const { data: relationship, error: relError } = await supabase
    .from("investor_company_relationships")
    .select("id, logo_url")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (relError || !relationship) {
    return jsonError("Company not in portfolio.", 403);
  }

  // Delete from storage if there's an existing logo
  if (relationship.logo_url) {
    // Extract path from URL (remove query params like ?v=timestamp)
    const urlParts = relationship.logo_url.split("/company-logos/");
    if (urlParts[1]) {
      const pathWithoutQuery = urlParts[1].split("?")[0];
      await supabase.storage.from("company-logos").remove([pathWithoutQuery]);
    }
  }

  // Clear logo_url in database
  const { error: updateError } = await supabase
    .from("investor_company_relationships")
    .update({ logo_url: null })
    .eq("investor_id", user.id)
    .eq("company_id", companyId);

  if (updateError) {
    console.error("Update error:", updateError);
    return jsonError("Failed to remove logo.", 500);
  }

  // Revalidate pages that show company logos
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");

  return NextResponse.json({ ok: true });
}

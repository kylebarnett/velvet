import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - Generate a signed download URL for the original uploaded file
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const { id: uploadId } = await params;

  // Verify ownership
  const { data: upload } = await supabase
    .from("historical_uploads")
    .select("id, file_path, file_name, status")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .single();

  if (!upload) return jsonError("Upload not found.", 404);

  if (!upload.file_path) {
    return jsonError("File not available.", 404);
  }

  // Admin client needed to create signed URL for private storage bucket
  const admin = createSupabaseAdminClient();

  const { data: signedUrl, error } = await admin.storage
    .from("historical-uploads")
    .createSignedUrl(upload.file_path, 300); // 5 minutes

  if (error || !signedUrl?.signedUrl) {
    return jsonError("Failed to generate download URL.", 500);
  }

  return NextResponse.json({
    url: signedUrl.signedUrl,
    fileName: upload.file_name,
  });
}

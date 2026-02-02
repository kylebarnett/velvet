import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const idSchema = z.string().uuid();

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const { id } = await params;

  // Validate ID format
  const parsed = idSchema.safeParse(id);
  if (!parsed.success) {
    return jsonError("Invalid document ID.", 400);
  }

  // Get founder's company
  const { data: company, error: companyError } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (companyError || !company) {
    return jsonError("No company found.", 404);
  }

  // Verify the document belongs to founder's company and was uploaded by them
  const { data: document, error: docError } = await supabase
    .from("documents")
    .select("id, file_path, company_id, uploaded_by")
    .eq("id", id)
    .single();

  if (docError || !document) {
    return jsonError("Document not found.", 404);
  }

  // Verify ownership
  if (document.company_id !== company.id || document.uploaded_by !== user.id) {
    return jsonError("Not authorized to delete this document.", 403);
  }

  // Use admin client to delete the file from storage and the database record
  const adminClient = createSupabaseAdminClient();

  // Delete from storage
  const { error: storageError } = await adminClient.storage
    .from("documents")
    .remove([document.file_path]);

  if (storageError) {
    console.error("Storage delete error:", storageError);
    // Continue to delete DB record even if storage fails
  }

  // Delete from database
  const { error: deleteError } = await adminClient
    .from("documents")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  return NextResponse.json({ ok: true });
}

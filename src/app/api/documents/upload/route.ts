import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

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

  const companyId = form.get("companyId");
  if (typeof companyId !== "string" || !companyId) {
    return jsonError("Missing companyId.", 400);
  }

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

  const { error: uploadError } = await supabase.storage
    .from("documents")
    .upload(filePath, file, { upsert: false });

  if (uploadError) return jsonError(uploadError.message, 400);

  const { data: doc, error: docErr } = await supabase
    .from("documents")
    .insert({
      company_id: companyId,
      uploaded_by: user.id,
      file_name: sanitizedName,
      file_path: filePath,
      file_type: file.type || null,
      file_size: file.size,
      ingestion_status: "pending",
    })
    .select("id")
    .single();

  if (docErr) return jsonError(docErr.message, 400);

  // TODO: queue ingestion (Edge Function) for AI extraction.

  return NextResponse.json({ id: doc.id });
}


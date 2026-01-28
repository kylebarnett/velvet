import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = user.user_metadata?.role as string | undefined;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Verify founder owns the document's company
  const { data: doc } = await supabase
    .from("documents")
    .select("company_id")
    .eq("id", id)
    .single();

  if (!doc) return jsonError("Document not found.", 404);

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", doc.company_id)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized to access this document.", 403);

  // For now: just mark as processing/completed as a placeholder.
  const { error } = await supabase
    .from("documents")
    .update({ ingestion_status: "processing" })
    .eq("id", id);

  if (error) return jsonError(error.message, 400);

  // TODO: enqueue + run extraction, store extracted_data, map to requests, mark completed/failed.

  return NextResponse.json({ ok: true });
}


import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  // For now: just mark as processing/completed as a placeholder.
  const { error } = await supabase
    .from("documents")
    .update({ ingestion_status: "processing" })
    .eq("id", id);

  if (error) return jsonError(error.message, 400);

  // TODO: enqueue + run extraction, store extracted_data, map to requests, mark completed/failed.

  return NextResponse.json({ ok: true });
}


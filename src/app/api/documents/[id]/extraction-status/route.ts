import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

export async function GET(
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
    .select("id, ingestion_status, extracted_data, company_id")
    .eq("id", id)
    .single();

  if (!doc) return jsonError("Document not found.", 404);

  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("id", doc.company_id)
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("Not authorized.", 403);

  // Fetch extraction mappings
  const { data: mappings } = await supabase
    .from("document_metric_mappings")
    .select(
      "id, extracted_metric_name, extracted_value, extracted_period_start, extracted_period_end, extracted_period_type, confidence_score, status",
    )
    .eq("document_id", id)
    .order("extracted_metric_name");

  return NextResponse.json({
    status: doc.ingestion_status,
    extractedData: doc.extracted_data,
    mappings: mappings ?? [],
  });
}

// Supabase Edge Function: process-document-ingestion
// Placeholder for future AI-powered extraction pipeline.

import { corsHeaders } from "../_shared/cors.ts";

type Payload = {
  documentId: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as Payload;
    if (!body?.documentId) {
      return new Response(JSON.stringify({ error: "Missing documentId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // TODO:
    // - Fetch document from Storage
    // - Extract text (PDF/Office)
    // - Call LLM to map fields into structured metrics
    // - Write extracted_data + document_metric_mappings
    // - Update documents.ingestion_status

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});


import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import type { ExtractionResult, ExtractedMetric } from "@/lib/ai/types";
import {
  EMAIL_EXTRACTION_SYSTEM_PROMPT,
  buildEmailUserPrompt,
} from "@/lib/ai/prompts";

const emailIngestSchema = z.object({
  content: z
    .string()
    .min(10, "Email content must be at least 10 characters.")
    .max(50000, "Email content must be at most 50,000 characters."),
  companyId: z.string().uuid("Invalid company ID."),
  targetMetrics: z.array(z.string()).optional(),
});

// Shared type for the raw AI response metrics
type RawMetric = {
  name?: string;
  value?: number | string;
  unit?: string | null;
  period_type?: string;
  period_start?: string;
  period_end?: string;
  confidence?: number;
  page_number?: number | null;
  context?: string | null;
};

function validatePeriodType(
  type: string,
): "monthly" | "quarterly" | "annual" {
  const normalized = String(type ?? "").toLowerCase();
  if (
    normalized === "monthly" ||
    normalized === "quarterly" ||
    normalized === "annual"
  ) {
    return normalized;
  }
  return "quarterly"; // default fallback
}

function normalizeMetrics(rawMetrics: RawMetric[]): ExtractedMetric[] {
  return rawMetrics.map((m) => ({
    name: String(m.name ?? ""),
    value: m.value ?? 0,
    unit: m.unit ?? null,
    period_type: validatePeriodType(String(m.period_type ?? "")),
    period_start: String(m.period_start ?? ""),
    period_end: String(m.period_end ?? ""),
    confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0)),
    page_number: null, // emails don't have pages
    context: m.context ?? null,
  }));
}

async function extractFromEmail(
  content: string,
  targetMetrics?: string[],
): Promise<ExtractionResult> {
  const startTime = Date.now();
  const systemPrompt = EMAIL_EXTRACTION_SYSTEM_PROMPT;
  const userPrompt = buildEmailUserPrompt(content, targetMetrics);

  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";

    // Retry with exponential backoff for rate limits (429)
    const MAX_RETRIES = 3;
    let response: Response | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
              temperature: 0.1,
              topP: 0.95,
              responseMimeType: "application/json",
            },
          }),
        },
      );

      if (response.status !== 429 || attempt === MAX_RETRIES) break;

      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      await new Promise((r) => setTimeout(r, delay));
    }

    if (!response!.ok) {
      const errText = await response!.text().catch(() => "Unknown error");
      throw new Error(`Gemini API error (${response!.status}): ${errText}`);
    }

    const data = await response!.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from Gemini.");

    // Strip markdown code fences if present
    let jsonText = String(text).trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText
        .replace(/^```(?:json)?\s*\n?/, "")
        .replace(/\n?```\s*$/, "");
    }

    const parsed = JSON.parse(jsonText) as {
      period_detected?: { type: string; start: string; end: string } | null;
      metrics?: RawMetric[];
    };

    return {
      provider: "gemini",
      model,
      extracted_at: new Date().toISOString(),
      period_detected: parsed.period_detected ?? null,
      metrics: normalizeMetrics(parsed.metrics ?? []),
      processing_time_ms: Date.now() - startTime,
    };
  } else if (openaiKey) {
    const model = process.env.OPENAI_EXTRACTION_MODEL || "gpt-4o-mini";
    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 4096,
        }),
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenAI API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("No response from OpenAI.");

    const parsed = JSON.parse(text) as {
      period_detected?: { type: string; start: string; end: string } | null;
      metrics?: RawMetric[];
    };

    return {
      provider: "openai",
      model,
      extracted_at: new Date().toISOString(),
      period_detected: parsed.period_detected ?? null,
      metrics: normalizeMetrics(parsed.metrics ?? []),
      processing_time_ms: Date.now() - startTime,
    };
  } else {
    throw new Error(
      "No AI provider configured. Set OPENAI_API_KEY or GOOGLE_AI_API_KEY.",
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = emailIngestSchema.safeParse(body);
    if (!parsed.success) {
      const firstError =
        parsed.error.issues[0]?.message ?? "Invalid request body.";
      return jsonError(firstError, 400);
    }

    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized.", 401);

    const role = user.user_metadata?.role;
    if (role !== "founder") return jsonError("Forbidden.", 403);

    const { content, companyId, targetMetrics } = parsed.data;

    // Verify founder owns this company
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("founder_id", user.id)
      .single();

    if (!company) return jsonError("Not authorized for this company.", 403);

    const result = await extractFromEmail(content, targetMetrics);

    return NextResponse.json({
      metrics: result.metrics,
      periodDetected: result.period_detected,
      provider: result.provider,
      model: result.model,
      processingTimeMs: result.processing_time_ms,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "Email extraction failed.";
    return jsonError(message, 500);
  }
}

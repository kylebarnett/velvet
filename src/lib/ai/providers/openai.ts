import type { ExtractionResult, MetricExtractor } from "../types";
import {
  FINANCIAL_EXTRACTION_SYSTEM_PROMPT,
  buildUserPrompt,
} from "../prompts";

const OPENAI_MODEL = process.env.OPENAI_EXTRACTION_MODEL ?? "gpt-4o-mini";

export class OpenAIExtractor implements MetricExtractor {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    _fileName: string,
    targetMetrics?: string[],
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    const base64Data = fileBuffer.toString("base64");
    const dataUrl = `data:${mimeType};base64,${base64Data}`;

    // Build content parts based on file type
    const isPdf = mimeType === "application/pdf";
    const isImage = mimeType.startsWith("image/");

    const userContent: Array<Record<string, unknown>> = [];

    if (isPdf || isImage) {
      userContent.push({
        type: "image_url",
        image_url: { url: dataUrl, detail: "high" },
      });
    }

    userContent.push({
      type: "text",
      text: buildUserPrompt(targetMetrics),
    });

    const requestBody = {
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: FINANCIAL_EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
      temperature: 0.1,
      max_tokens: 4096,
    };

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const textContent = data?.choices?.[0]?.message?.content;

    if (!textContent) {
      throw new Error("No content returned from OpenAI API.");
    }

    let parsed: {
      period_detected: { type: string; start: string; end: string } | null;
      metrics: Array<{
        name: string;
        value: number | string;
        unit: string | null;
        period_type: string;
        period_start: string;
        period_end: string;
        confidence: number;
        page_number: number | null;
        context: string | null;
      }>;
    };

    try {
      parsed = JSON.parse(textContent);
    } catch {
      throw new Error("Failed to parse OpenAI response as JSON.");
    }

    const processingTime = Date.now() - startTime;

    const metrics = (parsed.metrics ?? []).map((m) => ({
      name: String(m.name ?? ""),
      value: m.value,
      unit: m.unit ?? null,
      period_type: validatePeriodType(m.period_type),
      period_start: String(m.period_start ?? ""),
      period_end: String(m.period_end ?? ""),
      confidence: Math.max(0, Math.min(1, Number(m.confidence) || 0)),
      page_number: m.page_number != null ? Number(m.page_number) : null,
      context: m.context ?? null,
    }));

    return {
      provider: "openai",
      model: OPENAI_MODEL,
      extracted_at: new Date().toISOString(),
      period_detected: parsed.period_detected ?? null,
      metrics,
      processing_time_ms: processingTime,
    };
  }
}

function validatePeriodType(
  type: string,
): "monthly" | "quarterly" | "annual" {
  const normalized = String(type ?? "").toLowerCase();
  if (normalized === "monthly" || normalized === "quarterly" || normalized === "annual") {
    return normalized;
  }
  return "quarterly";
}

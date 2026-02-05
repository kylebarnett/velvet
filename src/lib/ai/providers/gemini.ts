import type { ExtractionResult, MetricExtractor } from "../types";
import {
  FINANCIAL_EXTRACTION_SYSTEM_PROMPT,
  buildUserPrompt,
} from "../prompts";

const GEMINI_MODEL = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const GEMINI_BASE = "https://generativelanguage.googleapis.com";

export class GeminiExtractor implements MetricExtractor {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Upload file via the Gemini File API to avoid inline data size limits.
   * Returns the file URI to reference in generateContent.
   */
  private async uploadFile(
    fileBuffer: Buffer,
    mimeType: string,
    displayName: string,
  ): Promise<string> {
    const numBytes = fileBuffer.byteLength;

    // Step 1: Start resumable upload
    const startRes = await fetch(
      `${GEMINI_BASE}/upload/v1beta/files?key=${this.apiKey}`,
      {
        method: "POST",
        headers: {
          "X-Goog-Upload-Protocol": "resumable",
          "X-Goog-Upload-Command": "start",
          "X-Goog-Upload-Header-Content-Length": String(numBytes),
          "X-Goog-Upload-Header-Content-Type": mimeType,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
      },
    );

    const uploadUrl = startRes.headers.get("X-Goog-Upload-URL");
    if (!uploadUrl) {
      throw new Error("Failed to start Gemini file upload — no upload URL returned.");
    }

    // Step 2: Upload the file bytes
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Content-Length": String(numBytes),
        "X-Goog-Upload-Offset": "0",
        "X-Goog-Upload-Command": "upload, finalize",
      },
      body: new Uint8Array(fileBuffer),
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text().catch(() => "Unknown error");
      throw new Error(`Gemini file upload failed (${uploadRes.status}): ${errText}`);
    }

    const uploadData = await uploadRes.json();
    const fileUri = uploadData?.file?.uri;
    if (!fileUri) {
      throw new Error("Gemini file upload returned no file URI.");
    }

    console.log(`[gemini] File uploaded: ${fileUri} (${numBytes} bytes)`);
    return fileUri;
  }

  async extract(
    fileBuffer: Buffer,
    mimeType: string,
    fileName: string,
    targetMetrics?: string[],
  ): Promise<ExtractionResult> {
    const startTime = Date.now();

    // Upload file first to avoid inline data rate limits
    const fileUri = await this.uploadFile(fileBuffer, mimeType, fileName);

    const requestBody = {
      contents: [
        {
          parts: [
            {
              fileData: {
                mimeType,
                fileUri,
              },
            },
            {
              text: buildUserPrompt(targetMetrics),
            },
          ],
        },
      ],
      systemInstruction: {
        parts: [{ text: FINANCIAL_EXTRACTION_SYSTEM_PROMPT }],
      },
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        responseMimeType: "application/json",
      },
    };

    const url = `${GEMINI_BASE}/v1beta/models/${GEMINI_MODEL}:generateContent?key=${this.apiKey}`;
    const body = JSON.stringify(requestBody);

    // Retry with exponential backoff for rate limits (429)
    const MAX_RETRIES = 3;
    let response: Response | null = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (response.status !== 429 || attempt === MAX_RETRIES) break;

      const delay = Math.min(2000 * Math.pow(2, attempt), 30000);
      console.log(`[gemini] Rate limited (429), retrying in ${delay}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    if (!response!.ok) {
      const errorText = await response!.text().catch(() => "Unknown error");
      throw new Error(
        `Gemini API error (${response!.status}): ${errorText}`,
      );
    }

    const data = await response!.json();

    const textContent =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textContent) {
      throw new Error("No content returned from Gemini API.");
    }

    // Strip markdown code fences if present
    let jsonText = textContent.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "").replace(/\n?```\s*$/, "");
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
      parsed = JSON.parse(jsonText);
    } catch {
      console.error("[gemini] Raw response (first 500 chars):", textContent.slice(0, 500));
      throw new Error("Failed to parse Gemini response as JSON.");
    }

    const processingTime = Date.now() - startTime;

    // Validate and normalize metrics
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
      provider: "gemini",
      model: GEMINI_MODEL,
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
  return "quarterly"; // default fallback
}

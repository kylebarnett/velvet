import { z } from "zod";

const SYSTEM_PROMPT = `You are a financial metrics expert. Given a metric name used in venture capital portfolio tracking, provide a concise description (1-2 sentences) and an optional formula.

Rules:
- The description should explain what the metric measures and why it matters
- Only include a formula if the metric has a standard, well-known calculation
- For qualitative or custom metrics, set formula to null
- Keep descriptions under 200 characters
- Do not include the metric name in the description

Respond with JSON: { "description": "...", "formula": "..." | null }`;

const responseSchema = z.object({
  description: z.string(),
  formula: z.string().nullable(),
});

export type MetricDefinitionResult = {
  description: string;
  formula?: string;
};

/**
 * Generate a metric definition using AI.
 * Tries Gemini first, falls back to OpenAI.
 */
export async function generateMetricDefinition(
  metricName: string,
): Promise<MetricDefinitionResult> {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  const userPrompt = `Metric name: "${metricName}"`;

  let text: string | undefined;

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
      },
    );
    const data = await response.json();
    text = data.candidates?.[0]?.content?.parts?.[0]?.text;
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
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
        }),
      },
    );
    const data = await response.json();
    text = data.choices?.[0]?.message?.content;
  } else {
    throw new Error("No AI provider configured.");
  }

  if (!text) throw new Error("No response from AI");

  const parsed = JSON.parse(text);
  const validated = responseSchema.parse(parsed);

  return {
    description: validated.description,
    formula: validated.formula ?? undefined,
  };
}

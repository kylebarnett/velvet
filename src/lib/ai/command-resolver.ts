import { z } from "zod";
import { getCommandsForRole, type Command } from "@/components/command-palette/commands";

const responseSchema = z.object({
  matches: z.array(
    z.object({
      id: z.string(),
      confidence: z.number().min(0).max(1),
    }),
  ),
});

export type AICommandMatch = z.infer<typeof responseSchema>["matches"][number];

function buildSystemPrompt(commands: Command[]): string {
  const commandList = commands
    .map((c) => `- id: "${c.id}" | label: "${c.label}" | keywords: [${(c.keywords ?? []).join(", ")}]`)
    .join("\n");

  return `You are a command palette assistant. Given a natural language query, determine which command(s) the user most likely wants.

Available commands:
${commandList}

Rules:
- Return 1-3 best matching commands with confidence scores (0-1)
- Only include matches with confidence >= 0.3
- Consider intent, not just keyword overlap
- A query about "sending" or "requesting" data maps to metric request commands
- A query about "files" or "where are my files" maps to document commands
- A query about "dark" or "light" or "theme" maps to toggle theme
- A query about "adding a company" maps to import commands

Examples:
- "add a company quickly" → [{ "id": "act-import-csv", "confidence": 0.9 }]
- "send data request to founders" → [{ "id": "act-new-request", "confidence": 0.95 }]
- "switch to dark mode" → [{ "id": "act-toggle-theme", "confidence": 0.95 }]
- "where are my files" → [{ "id": "nav-documents", "confidence": 0.9 }]
- "make a new tear sheet" → [{ "id": "act-new-tear-sheet", "confidence": 0.95 }]

Respond with JSON only: { "matches": [{ "id": "...", "confidence": 0.0 }] }`;
}

/**
 * Resolve a natural language query to command IDs using AI.
 * Tries Gemini first, falls back to OpenAI. Returns empty matches if no AI is configured.
 */
export async function resolveCommand(
  query: string,
  role: "investor" | "founder",
  signal?: AbortSignal,
): Promise<AICommandMatch[]> {
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!geminiKey && !openaiKey) {
    return [];
  }

  const commands = getCommandsForRole(role);
  const systemPrompt = buildSystemPrompt(commands);
  const userPrompt = `Query: "${query}"`;
  const validIds = new Set(commands.map((c) => c.id));

  let text: string | undefined;

  if (geminiKey) {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal,
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
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
        signal,
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.1,
          max_tokens: 200,
        }),
      },
    );
    const data = await response.json();
    text = data.choices?.[0]?.message?.content;
  }

  if (!text) return [];

  try {
    const parsed = JSON.parse(text);
    const validated = responseSchema.parse(parsed);
    // Filter out non-existent command IDs
    return validated.matches.filter((m) => validIds.has(m.id));
  } catch {
    return [];
  }
}

import type { MetricExtractor } from "./types";
import { GeminiExtractor } from "./providers/gemini";
import { OpenAIExtractor } from "./providers/openai";

export function createExtractor(): MetricExtractor {
  // Prefer Gemini if set, fall back to OpenAI
  const geminiKey = process.env.GOOGLE_AI_API_KEY;
  if (geminiKey) {
    return new GeminiExtractor(geminiKey);
  }

  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return new OpenAIExtractor(openaiKey);
  }

  throw new Error(
    "No AI provider configured. Set OPENAI_API_KEY or GOOGLE_AI_API_KEY.",
  );
}

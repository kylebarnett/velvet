import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { getMetricDefinition } from "@/lib/metric-definitions";
import { generateMetricDefinition } from "@/lib/ai/metric-definition-generator";

const bodySchema = z.object({
  metricName: z.string().min(1).max(200),
});

// Server-side cache: normalized name → { result, expiresAt }
const cache = new Map<
  string,
  { result: { description: string; formula?: string }; expiresAt: number }
>();

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export async function POST(req: NextRequest) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { metricName } = parsed.data;

  // Rate limit: 30 requests per minute per user
  const { allowed, retryAfter } = checkRateLimit(
    `suggest-def:${user.id}`,
    30,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many requests. Please try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  // Short-circuit: return catalog definition if available (no AI call)
  const systemDef = getMetricDefinition(metricName);
  if (systemDef) {
    return NextResponse.json({
      description: systemDef.description,
      formula: systemDef.formula ?? null,
      source: "catalog" as const,
    });
  }

  // Check server cache
  const cacheKey = metricName.toLowerCase().trim();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json({
      ...cached.result,
      formula: cached.result.formula ?? null,
      source: "ai" as const,
    });
  }

  try {
    const result = await generateMetricDefinition(metricName);

    // Cache the result
    cache.set(cacheKey, {
      result,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });

    return NextResponse.json({
      description: result.description,
      formula: result.formula ?? null,
      source: "ai" as const,
    });
  } catch {
    return jsonError("Failed to generate definition.", 500);
  }
}

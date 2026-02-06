import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  parseNaturalLanguageQuery,
  executeStructuredQuery,
  formatQueryResult,
} from "@/lib/ai/portfolio-query";

const querySchema = z.object({
  query: z.string().min(3, "Query must be at least 3 characters.").max(500, "Query must be at most 500 characters."),
});

export async function POST(req: Request) {
  try {
    const { supabase, user } = await getApiUser();
    if (!user) return jsonError("Unauthorized.", 401);

    const role = user.user_metadata?.role;
    if (role !== "investor") return jsonError("Forbidden.", 403);

    // Rate limit: 20 queries per minute per user
    const { allowed, retryAfter } = checkRateLimit(
      `query:${user.id}`,
      20,
      60_000,
    );
    if (!allowed) {
      return jsonError("Too many requests. Please try again shortly.", 429, {
        "Retry-After": String(retryAfter ?? 60),
      });
    }

    // Validate body
    const body = await req.json();
    const parsed = querySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? "Invalid input.", 400);
    }

    const { query } = parsed.data;

    // Parse natural language → structured query via AI
    const structuredQuery = await parseNaturalLanguageQuery(query);

    // Execute structured query against the database
    const result = await executeStructuredQuery(
      structuredQuery,
      supabase,
      user.id,
    );

    return NextResponse.json({
      answer: formatQueryResult(result),
      data: result.data,
      chartData: result.chartData,
      queryType: result.type,
    });
  } catch (e: unknown) {
    const message =
      e instanceof Error ? e.message : "An unexpected error occurred.";
    return jsonError(message, 500);
  }
}

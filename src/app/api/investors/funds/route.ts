import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  vintage_year: z.number().int().min(1990).max(2100),
  fund_size: z.number().positive().optional(),
  currency: z.string().min(1).max(10).optional(),
});

// GET - List all funds for investor
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { limit, offset } = parsePagination(new URL(req.url));

  const { data: funds, error } = await supabase
    .from("funds")
    .select("id, name, vintage_year, fund_size, currency, created_at")
    .eq("investor_id", user.id)
    .order("vintage_year", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("Failed to list funds:", error.message);
    return jsonError("Failed to process request.", 500);
  }

  return NextResponse.json({ funds: funds ?? [] });
}

// POST - Create a fund
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Rate limit: 10 fund creations per minute per user
  const { allowed, retryAfter } = checkRateLimit(`fund-create:${user.id}`, 10, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  const { name, vintage_year, fund_size, currency } = parsed.data;

  const { data: fund, error } = await supabase
    .from("funds")
    .insert({
      investor_id: user.id,
      name,
      vintage_year,
      fund_size: fund_size ?? null,
      currency: currency ?? "USD",
    })
    .select("*")
    .single();

  if (error) {
    logger.error("Failed to create fund:", error.message);
    return jsonError("Failed to process request.", 500);
  }

  return NextResponse.json({ fund, ok: true }, { status: 201 });
}

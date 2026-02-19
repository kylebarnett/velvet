import { NextResponse } from "next/server";
import { z } from "zod";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { resolveCommand } from "@/lib/ai/command-resolver";

const bodySchema = z.object({
  query: z.string().min(2).max(200),
  role: z.enum(["investor", "founder"]),
});

export async function POST(req: Request) {
  const { user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const userRole = user.app_metadata?.role as string | undefined;
  if (userRole !== "investor" && userRole !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const { allowed, retryAfter } = checkRateLimit(
    `cmd-resolve:${user.id}`,
    30,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many requests.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return jsonError("Invalid request.", 400);
  }

  // Ensure client-sent role matches the authenticated user's role
  if (parsed.data.role !== userRole) {
    return jsonError("Forbidden.", 403);
  }

  const matches = await resolveCommand(parsed.data.query, parsed.data.role);

  return NextResponse.json(
    { matches },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(`login:${ip}`, 10, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, response } = createSupabaseRouteHandlerClient(request);
  const { email, password } = parsed.data;

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return jsonError("Invalid email or password.", 401);

  return NextResponse.json({ ok: true }, { headers: response.headers });
}


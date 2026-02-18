import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";

const schema = z.object({
  email: z.string().email("Invalid email address"),
});

// PUT - Request email change (Supabase sends confirmation to new address)
export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Rate limit: 3 email change attempts per minute per user
  const { allowed, retryAfter } = checkRateLimit(
    `change-email:${user.id}`,
    3,
    60_000,
  );
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(
      parsed.error.issues[0]?.message ?? "Invalid email address.",
      400,
    );
  }

  const { error } = await supabase.auth.updateUser({
    email: parsed.data.email,
  });

  if (error) {
    return jsonError(
      error.message ?? "Failed to update email. Please try again.",
      400,
    );
  }

  return NextResponse.json({
    ok: true,
    message: "Confirmation email sent to your new address.",
  });
}

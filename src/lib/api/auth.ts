import { NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getApiUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

export function jsonError(
  message: string,
  status = 400,
  headers?: Record<string, string>,
) {
  return NextResponse.json({ error: message }, { status, headers });
}

/**
 * Verify that the request Origin header matches NEXT_PUBLIC_APP_URL.
 * Lightweight CSRF defense-in-depth alongside SameSite=Lax cookies.
 * Returns null if valid, or a 403 response if invalid.
 */
export function verifyCsrfOrigin(req: NextRequest): NextResponse | null {
  const origin = req.headers.get("origin");
  if (!origin) return null; // Same-origin requests may omit Origin

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null; // Skip check if not configured

  try {
    const allowed = new URL(appUrl).origin;
    if (origin === allowed) return null;
  } catch {
    return null; // Invalid APP_URL config — don't block
  }

  return jsonError("Forbidden.", 403);
}


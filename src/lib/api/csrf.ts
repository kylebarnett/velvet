import { NextRequest, NextResponse } from "next/server";

/**
 * Verify that the request Origin header matches NEXT_PUBLIC_APP_URL.
 * Lightweight CSRF defense-in-depth alongside SameSite=Lax cookies.
 * Returns null if valid, or a 403 response if invalid.
 *
 * This is in its own file (separate from auth.ts) so it can be imported
 * from middleware without pulling in Supabase server client dependencies.
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

  return NextResponse.json({ error: "Forbidden." }, { status: 403 });
}

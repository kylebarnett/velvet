import { NextResponse, type NextRequest } from "next/server";

import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

// Allowed redirect paths (whitelist)
const ALLOWED_REDIRECTS = ["/app", "/dashboard", "/portal", "/portfolio", "/requests"];

function isValidRedirect(path: string): boolean {
  // Must be a relative path starting with /
  if (!path.startsWith("/")) return false;
  // Prevent protocol-relative URLs (//evil.com)
  if (path.startsWith("//")) return false;
  // Check against whitelist or allow any path under allowed prefixes
  return ALLOWED_REDIRECTS.some((allowed) => path === allowed || path.startsWith(allowed + "/"));
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/app";

  // Validate redirect URL to prevent open redirect attacks
  const safePath = isValidRedirect(next) ? next : "/app";

  if (code) {
    const { supabase, response } = createSupabaseRouteHandlerClient(request);
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Merge cookies into redirect response
      const redirectUrl = new URL(safePath, origin);
      const redirectResponse = NextResponse.redirect(redirectUrl);

      response.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie.name, cookie.value, {
          ...cookie,
        });
      });

      return redirectResponse;
    }
  }

  // Return to login on error
  return NextResponse.redirect(new URL("/login", origin));
}

import { NextResponse } from "next/server";

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


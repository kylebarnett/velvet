import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from("users")
      .select("id")
      .limit(1)
      .single();

    // We only care that the DB responded, not whether a row was found
    if (error && error.code !== "PGRST116") {
      return NextResponse.json(
        { ok: false, timestamp: new Date().toISOString(), error: "DB unreachable" },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, timestamp: new Date().toISOString(), error: "DB unreachable" },
      { status: 503 },
    );
  }
}

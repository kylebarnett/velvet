import { NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    // Simple query to verify DB connectivity — no admin client needed
    const { error } = await supabase
      .from("organizations")
      .select("id")
      .limit(1);

    if (error) {
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

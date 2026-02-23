import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { getUnreadCountForUser } from "@/lib/chat/queries";

// ---------------------------------------------------------------------------
// GET /api/chat/unread-count — Total unread badge count across conversations
// ---------------------------------------------------------------------------

export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const count = await getUnreadCountForUser(supabase, user.id);

  return NextResponse.json(
    { count, ok: true },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    },
  );
}

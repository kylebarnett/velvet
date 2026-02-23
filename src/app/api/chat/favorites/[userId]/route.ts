import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// ---------------------------------------------------------------------------
// DELETE /api/chat/favorites/[userId] — Remove a favorite
// ---------------------------------------------------------------------------

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { error: deleteError } = await supabase
    .from("user_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("favorite_user_id", userId);

  if (deleteError) return jsonError("Failed to remove favorite.", 500);

  return NextResponse.json({ ok: true });
}

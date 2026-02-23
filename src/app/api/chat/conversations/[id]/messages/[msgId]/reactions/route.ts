import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";
import { addReactionSchema } from "@/lib/chat/schemas";

// ---------------------------------------------------------------------------
// POST /api/chat/conversations/[id]/messages/[msgId]/reactions — Add reaction
// ---------------------------------------------------------------------------

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const { id, msgId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Verify user is active participant in the conversation
  const isParticipant = await isActiveParticipant(supabase, id, user.id);
  if (!isParticipant) return jsonError("Forbidden.", 403);

  // Verify message belongs to this conversation
  const { data: message } = await supabase
    .from("messages")
    .select("id")
    .eq("id", msgId)
    .eq("conversation_id", id)
    .is("deleted_at", null)
    .maybeSingle();

  if (!message) return jsonError("Message not found in this conversation.", 404);

  const parsed = addReactionSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { emoji } = parsed.data;

  // Insert reaction — on conflict (duplicate), just succeed silently
  const { error: insertError } = await supabase
    .from("message_reactions")
    .upsert(
      {
        message_id: msgId,
        user_id: user.id,
        emoji,
      },
      { onConflict: "message_id,user_id,emoji" },
    );

  if (insertError) return jsonError("Failed to add reaction.", 500);

  return NextResponse.json({ ok: true }, { status: 201 });
}

// ---------------------------------------------------------------------------
// DELETE /api/chat/conversations/[id]/messages/[msgId]/reactions — Remove reaction
// ---------------------------------------------------------------------------

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; msgId: string }> },
) {
  const { id, msgId } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const emoji = url.searchParams.get("emoji");

  if (!emoji) return jsonError("emoji query parameter is required.", 400);

  // Verify user is active participant in the conversation
  const isParticipant = await isActiveParticipant(supabase, id, user.id);
  if (!isParticipant) return jsonError("Forbidden.", 403);

  // Delete the specific reaction
  const { error: deleteError } = await supabase
    .from("message_reactions")
    .delete()
    .eq("message_id", msgId)
    .eq("user_id", user.id)
    .eq("emoji", emoji);

  if (deleteError) return jsonError("Failed to remove reaction.", 500);

  return NextResponse.json({ ok: true });
}

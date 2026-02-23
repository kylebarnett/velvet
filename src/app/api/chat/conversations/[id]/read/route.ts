import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { isActiveParticipant } from "@/lib/chat/queries";
import { markReadSchema } from "@/lib/chat/schemas";

// ---------------------------------------------------------------------------
// PUT /api/chat/conversations/[id]/read — Mark conversation as read
// ---------------------------------------------------------------------------

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Verify user is active participant
  const isParticipant = await isActiveParticipant(supabase, id, user.id);
  if (!isParticipant) return jsonError("Forbidden.", 403);

  const parsed = markReadSchema.safeParse(
    await req.json().catch(() => null),
  );
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { lastReadMessageId } = parsed.data;

  // Verify the message belongs to this conversation
  const { data: message } = await supabase
    .from("messages")
    .select("id")
    .eq("id", lastReadMessageId)
    .eq("conversation_id", id)
    .maybeSingle();

  if (!message) return jsonError("Message not found in this conversation.", 400);

  // Upsert read receipt (on conflict: conversation_id + user_id)
  const { error: upsertError } = await supabase
    .from("read_receipts")
    .upsert(
      {
        conversation_id: id,
        user_id: user.id,
        last_read_message_id: lastReadMessageId,
        last_read_at: new Date().toISOString(),
      },
      { onConflict: "conversation_id,user_id" },
    );

  if (upsertError) return jsonError("Failed to mark as read.", 500);

  return NextResponse.json({ ok: true });
}

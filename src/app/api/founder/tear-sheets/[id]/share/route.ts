import { randomUUID } from "crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const schema = z.object({
  enabled: z.boolean(),
});

// POST - Toggle sharing / generate share token
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const { id } = await params;

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { enabled } = parsed.data;

  // Verify ownership
  const { data: tearSheet } = await supabase
    .from("tear_sheets")
    .select("id, status, share_token")
    .eq("id", id)
    .eq("founder_id", user.id)
    .single();

  if (!tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  // Must be published to enable sharing
  if (enabled && tearSheet.status !== "published") {
    return jsonError("Tear sheet must be published before sharing.", 400);
  }

  // Always generate a fresh token when enabling sharing so that
  // previously-compromised tokens cannot be reused.
  const updateData: Record<string, unknown> = {
    share_enabled: enabled,
  };

  if (enabled) {
    updateData.share_token = randomUUID();
  }

  const { data: updated, error } = await supabase
    .from("tear_sheets")
    .update(updateData)
    .eq("id", id)
    .eq("founder_id", user.id)
    .select("share_token, share_enabled")
    .single();

  if (error) {
    console.error("Share toggle error:", error);
    return jsonError("Failed to update sharing.", 500);
  }

  return NextResponse.json({
    shareToken: updated.share_enabled ? updated.share_token : null,
    shareEnabled: updated.share_enabled,
    ok: true,
  });
}

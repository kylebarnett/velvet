import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// POST - Pause a schedule
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Verify schedule exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from("metric_request_schedules")
    .select("id, is_active")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !existing) {
    return jsonError("Schedule not found.", 404);
  }

  if (!existing.is_active) {
    return jsonError("Schedule is already paused.", 400);
  }

  const { error: updateError } = await supabase
    .from("metric_request_schedules")
    .update({
      is_active: false,
      next_run_at: null,
    })
    .eq("id", id);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({ ok: true, isActive: false });
}

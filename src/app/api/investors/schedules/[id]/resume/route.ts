import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { calculateNextRunDate } from "@/lib/schedules";

// POST - Resume a paused schedule
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
    .select("id, is_active, cadence, day_of_month")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !existing) {
    return jsonError("Schedule not found.", 404);
  }

  if (existing.is_active) {
    return jsonError("Schedule is already active.", 400);
  }

  // Calculate next run date
  const nextRunAt = calculateNextRunDate(
    existing.cadence as "monthly" | "quarterly" | "annual",
    existing.day_of_month
  );

  const { error: updateError } = await supabase
    .from("metric_request_schedules")
    .update({
      is_active: true,
      next_run_at: nextRunAt.toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return jsonError(updateError.message, 500);
  }

  return NextResponse.json({
    ok: true,
    isActive: true,
    nextRunAt: nextRunAt.toISOString(),
  });
}

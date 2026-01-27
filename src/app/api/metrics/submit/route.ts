import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const schema = z.object({
  requestId: z.string().uuid().or(z.string().min(1)),
  value: z.string().min(1),
  notes: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized", 401);

  const role = (user.user_metadata?.role as string | undefined) ?? null;
  if (role !== "founder") return jsonError("Forbidden", 403);

  const { requestId, value, notes } = parsed.data;

  const { data: submission, error } = await supabase
    .from("metric_submissions")
    .insert({
      metric_request_id: requestId,
      value: { raw: value },
      submitted_by: user.id,
      notes: notes ?? null,
    })
    .select("id")
    .single();

  if (error) return jsonError(error.message, 400);

  // Mark request as submitted (best-effort)
  await supabase
    .from("metric_requests")
    .update({ status: "submitted" })
    .eq("id", requestId);

  return NextResponse.json({ id: submission.id });
}


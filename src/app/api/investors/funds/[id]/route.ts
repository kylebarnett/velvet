import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  vintage_year: z.number().int().min(1990).max(2100).optional(),
  fund_size: z.number().positive().nullable().optional(),
  currency: z.string().min(1).max(10).optional(),
});

// GET - Single fund by id
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  const { data: fund, error } = await supabase
    .from("funds")
    .select("*")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error || !fund) {
    return jsonError("Fund not found.", 404);
  }

  return NextResponse.json({ fund });
}

// PUT - Update fund fields
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("Fund not found.", 404);
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.vintage_year !== undefined) updateData.vintage_year = parsed.data.vintage_year;
  if (parsed.data.fund_size !== undefined) updateData.fund_size = parsed.data.fund_size;
  if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { data: fund, error } = await supabase
    .from("funds")
    .update(updateData)
    .eq("id", id)
    .eq("investor_id", user.id)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ fund, ok: true });
}

// DELETE - Delete fund (cascades to investments and reports)
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  // Verify ownership
  const { data: existing } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("Fund not found.", 404);
  }

  const { error } = await supabase
    .from("funds")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

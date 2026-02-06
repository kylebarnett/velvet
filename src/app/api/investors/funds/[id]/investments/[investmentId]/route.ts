import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  invested_amount: z.number().nonnegative().optional(),
  current_value: z.number().nonnegative().optional(),
  realized_value: z.number().nonnegative().optional(),
  investment_date: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

// PUT - Update an investment
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; investmentId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id, investmentId } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  // Verify investment belongs to this fund
  const { data: existing } = await supabase
    .from("fund_investments")
    .select("id")
    .eq("id", investmentId)
    .eq("fund_id", id)
    .single();

  if (!existing) return jsonError("Investment not found.", 404);

  const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (parsed.data.invested_amount !== undefined) updateData.invested_amount = parsed.data.invested_amount;
  if (parsed.data.current_value !== undefined) updateData.current_value = parsed.data.current_value;
  if (parsed.data.realized_value !== undefined) updateData.realized_value = parsed.data.realized_value;
  if (parsed.data.investment_date !== undefined) updateData.investment_date = parsed.data.investment_date;
  if (parsed.data.notes !== undefined) updateData.notes = parsed.data.notes;

  const { data: investment, error } = await supabase
    .from("fund_investments")
    .update(updateData)
    .eq("id", investmentId)
    .eq("fund_id", id)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ investment, ok: true });
}

// DELETE - Delete an investment
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; investmentId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id, investmentId } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  // Verify investment belongs to this fund
  const { data: existing } = await supabase
    .from("fund_investments")
    .select("id")
    .eq("id", investmentId)
    .eq("fund_id", id)
    .single();

  if (!existing) return jsonError("Investment not found.", 404);

  const { error } = await supabase
    .from("fund_investments")
    .delete()
    .eq("id", investmentId)
    .eq("fund_id", id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

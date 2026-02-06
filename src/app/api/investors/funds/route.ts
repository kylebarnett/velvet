import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const createSchema = z.object({
  name: z.string().min(1).max(200),
  vintage_year: z.number().int().min(1990).max(2100),
  fund_size: z.number().positive().optional(),
  currency: z.string().min(1).max(10).optional(),
});

// GET - List all funds for investor
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { data: funds, error } = await supabase
    .from("funds")
    .select("*")
    .eq("investor_id", user.id)
    .order("vintage_year", { ascending: false });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ funds: funds ?? [] });
}

// POST - Create a fund
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  const { name, vintage_year, fund_size, currency } = parsed.data;

  const { data: fund, error } = await supabase
    .from("funds")
    .insert({
      investor_id: user.id,
      name,
      vintage_year,
      fund_size: fund_size ?? null,
      currency: currency ?? "USD",
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ fund, ok: true }, { status: 201 });
}

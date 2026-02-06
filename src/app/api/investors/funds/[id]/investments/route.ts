import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const createSchema = z.object({
  company_id: z.string().uuid(),
  invested_amount: z.number().nonnegative(),
  current_value: z.number().nonnegative().optional(),
  realized_value: z.number().nonnegative().optional(),
  investment_date: z.string().optional(),
  notes: z.string().max(1000).optional(),
});

// GET - List investments for fund with company names
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  const { data: investments, error } = await supabase
    .from("fund_investments")
    .select("*, companies(id, name)")
    .eq("fund_id", id)
    .order("investment_date", { ascending: false });

  if (error) return jsonError(error.message, 500);

  // Normalize joined companies (may come as array from Supabase)
  const normalized = (investments ?? []).map((inv) => {
    const companyRaw = inv.companies;
    const company = Array.isArray(companyRaw)
      ? (companyRaw[0] as { id: string; name: string } | undefined)
      : (companyRaw as { id: string; name: string } | null);
    return {
      ...inv,
      company_name: company?.name ?? "Unknown",
      companies: undefined,
    };
  });

  return NextResponse.json({ investments: normalized });
}

// POST - Add investment to fund
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  const { company_id, invested_amount, current_value, realized_value, investment_date, notes } = parsed.data;

  // Verify investor has relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", company_id)
    .single();

  if (!relationship) return jsonError("Company not in portfolio.", 403);

  const { data: investment, error } = await supabase
    .from("fund_investments")
    .insert({
      fund_id: id,
      company_id,
      invested_amount,
      current_value: current_value ?? 0,
      realized_value: realized_value ?? 0,
      investment_date: investment_date ?? null,
      notes: notes ?? null,
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ investment, ok: true }, { status: 201 });
}

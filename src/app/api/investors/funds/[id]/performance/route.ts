import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import {
  calculateTVPI,
  calculateDPI,
  calculateRVPI,
  calculateMOIC,
  calculateIRR,
  type Investment,
  type CashFlow,
} from "@/lib/lp/calculations";

// GET - Fund performance metrics
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

  // Fetch all investments for the fund
  const { data: rawInvestments, error } = await supabase
    .from("fund_investments")
    .select("invested_amount, current_value, realized_value, investment_date")
    .eq("fund_id", id);

  if (error) return jsonError(error.message, 500);

  const rows = rawInvestments ?? [];

  const investments: Investment[] = rows.map((row) => ({
    invested_amount: Number(row.invested_amount) || 0,
    current_value: Number(row.current_value) || 0,
    realized_value: Number(row.realized_value) || 0,
  }));

  const tvpi = calculateTVPI(investments);
  const dpi = calculateDPI(investments);
  const rvpi = calculateRVPI(investments);
  const moic = calculateMOIC(investments);

  // Build cash flows for IRR
  const cashFlows: CashFlow[] = [];
  const now = new Date();

  for (const row of rows) {
    const investedAmt = Number(row.invested_amount) || 0;
    const realizedAmt = Number(row.realized_value) || 0;
    const currentAmt = Number(row.current_value) || 0;

    const investmentDate = row.investment_date
      ? new Date(row.investment_date)
      : new Date(now.getFullYear() - 1, 0, 1); // Fallback to Jan 1 of last year

    // Outflow at investment date
    if (investedAmt > 0) {
      cashFlows.push({ date: investmentDate, amount: -investedAmt });
    }

    // Realized distributions returned at investment date (simplified)
    if (realizedAmt > 0) {
      cashFlows.push({ date: now, amount: realizedAmt });
    }

    // Unrealized value as terminal cash flow today
    if (currentAmt > 0) {
      cashFlows.push({ date: now, amount: currentAmt });
    }
  }

  const irr = calculateIRR(cashFlows);

  let totalInvested = 0;
  let totalCurrentValue = 0;
  let totalRealizedValue = 0;
  for (const inv of investments) {
    totalInvested += inv.invested_amount;
    totalCurrentValue += inv.current_value;
    totalRealizedValue += inv.realized_value;
  }

  return NextResponse.json({
    tvpi,
    dpi,
    rvpi,
    moic,
    irr,
    totalInvested,
    totalCurrentValue,
    totalRealizedValue,
    investmentCount: investments.length,
  });
}

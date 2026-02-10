import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

// GET - List all LP reports across investor's funds
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { data: reports, error } = await supabase
    .from("lp_reports")
    .select("id, fund_id, report_date, report_type, title, status, created_at, funds!inner(name)")
    .order("report_date", { ascending: false });

  if (error) {
    logger.error("Failed to fetch LP reports:", error.message);
    return jsonError("Failed to fetch reports.", 500);
  }

  // Flatten fund name from join
  const formatted = (reports ?? []).map((r) => {
    const fundsRaw = r.funds;
    const fund = Array.isArray(fundsRaw) ? fundsRaw[0] : fundsRaw;
    return {
      id: r.id,
      fund_id: r.fund_id,
      fund_name: (fund as { name: string } | null)?.name ?? "Unknown",
      report_date: r.report_date,
      report_type: r.report_type,
      title: r.title,
      status: r.status,
      created_at: r.created_at,
    };
  });

  return NextResponse.json({ reports: formatted });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  companyId: z.string().uuid(),
  title: z.string().min(1).max(200),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.number().int().min(2000).max(2100),
  content: z.record(z.string(), z.unknown()).default({}),
});

// GET - List all investor tear sheets across companies
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { limit, offset } = parsePagination(new URL(req.url));

  // RLS handles filtering: returns investor's own tear sheets (any status)
  // + published founder tear sheets for approved companies
  const { data: tearSheets, error } = await supabase
    .from("tear_sheets")
    .select(`
      id, title, quarter, year, status, share_enabled, share_token,
      created_at, updated_at, creator_role, company_id,
      companies(name),
      founder:users!tear_sheets_founder_id_fkey(full_name),
      investor:users!tear_sheets_investor_id_fkey(full_name)
    `)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    logger.error("Investor tear sheet list error:", error);
    return jsonError("Failed to load tear sheets.", 500);
  }

  // Flatten joined fields
  const result = (tearSheets ?? []).map((ts) => {
    const company = Array.isArray(ts.companies) ? ts.companies[0] : ts.companies;
    const founder = Array.isArray(ts.founder) ? ts.founder[0] : ts.founder;
    const investor = Array.isArray(ts.investor) ? ts.investor[0] : ts.investor;
    const creatorName = ts.creator_role === "founder"
      ? (founder?.full_name ?? null)
      : (investor?.full_name ?? null);
    return {
      ...ts,
      companyName: company?.name ?? null,
      creatorName,
      companies: undefined,
      founder: undefined,
      investor: undefined,
    };
  });

  return NextResponse.json({ tearSheets: result });
}

// POST - Create an investor tear sheet
export async function POST(req: Request) {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = checkRateLimit(`investor-tear-sheets-create:${ip}`, 10, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { companyId, title, quarter, year, content } = parsed.data;

  // Verify investor has an approved relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .in("approval_status", ["auto_approved", "approved"])
    .single();

  if (!relationship) {
    return jsonError("Company not in portfolio or not approved.", 403);
  }

  const { data: tearSheet, error } = await supabase
    .from("tear_sheets")
    .insert({
      company_id: companyId,
      investor_id: user.id,
      creator_role: "investor",
      title,
      quarter,
      year,
      content,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(
        "A tear sheet for this quarter already exists for this company.",
        409,
      );
    }
    logger.error("Investor tear sheet create error:", error);
    return jsonError("Failed to create tear sheet.", 500);
  }

  return NextResponse.json({ tearSheet, ok: true }, { status: 201 });
}

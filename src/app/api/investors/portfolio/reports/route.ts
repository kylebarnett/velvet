import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";
import { logger } from "@/lib/logger";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  reportType: z.enum(["summary", "comparison", "benchmarks", "deep_dive"]),
  filters: z.record(z.string(), z.unknown()).optional(),
  companyIds: z.array(z.string().uuid()).optional(),
  normalize: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
  isDefault: z.boolean().optional(),
});

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const url = new URL(req.url);
  const reportType = url.searchParams.get("reportType");
  const { limit, offset } = parsePagination(url);

  let query = supabase
    .from("portfolio_reports")
    .select("id, name, description, report_type, is_default, company_ids, normalize, created_at, updated_at")
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (reportType) {
    query = query.eq("report_type", reportType);
  }

  query = query.range(offset, offset + limit - 1);

  const { data, error } = await query;
  if (error) {
    logger.error("Failed to fetch reports:", error.message);
    return jsonError("Failed to fetch reports.", 500);
  }

  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(req: Request) {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { name, description, reportType, filters, companyIds, normalize, config, isDefault } =
    parsed.data;

  // If setting as default, unset other defaults of the same type
  if (isDefault) {
    await supabase
      .from("portfolio_reports")
      .update({ is_default: false })
      .eq("investor_id", user.id)
      .eq("report_type", reportType)
      .eq("is_default", true);
  }

  const { data, error } = await supabase
    .from("portfolio_reports")
    .insert({
      investor_id: user.id,
      name,
      description: description ?? null,
      report_type: reportType,
      filters: filters ?? {},
      company_ids: companyIds ?? [],
      normalize: normalize ?? null,
      config: config ?? {},
      is_default: isDefault ?? false,
    })
    .select("id")
    .single();

  if (error) {
    logger.error("Failed to create report:", error.message);
    return jsonError("Failed to create report.", 500);
  }

  return NextResponse.json({ id: data.id, ok: true });
}

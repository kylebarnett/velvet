import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  report_date: z.string(),
  report_type: z.enum(["quarterly", "annual", "ad_hoc"]).default("quarterly"),
  content: z.record(z.string(), z.unknown()).default({}),
  status: z.enum(["draft", "published"]).default("draft"),
});

// GET - List LP reports for fund
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

  const { data: reports, error } = await supabase
    .from("lp_reports")
    .select("*")
    .eq("fund_id", id)
    .order("report_date", { ascending: false });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ reports: reports ?? [] });
}

// POST - Create LP report
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

  const { title, report_date, report_type, content, status } = parsed.data;

  const { data: report, error } = await supabase
    .from("lp_reports")
    .insert({
      fund_id: id,
      title,
      report_date,
      report_type,
      content,
      status,
    })
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ report, ok: true }, { status: 201 });
}

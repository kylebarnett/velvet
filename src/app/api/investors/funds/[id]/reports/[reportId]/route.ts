import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  report_date: z.string().optional(),
  report_type: z.enum(["quarterly", "annual", "ad_hoc"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

// GET - Fetch single LP report
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id, reportId } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  const { data: report, error } = await supabase
    .from("lp_reports")
    .select("*")
    .eq("id", reportId)
    .eq("fund_id", id)
    .single();

  if (error || !report) return jsonError("Report not found.", 404);

  return NextResponse.json({ report });
}

// PUT - Update LP report
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id, reportId } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  // Verify report belongs to this fund
  const { data: existing } = await supabase
    .from("lp_reports")
    .select("id")
    .eq("id", reportId)
    .eq("fund_id", id)
    .single();

  if (!existing) return jsonError("Report not found.", 404);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError(`Invalid request body: ${parsed.error.message}`, 400);
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.report_date !== undefined) updateData.report_date = parsed.data.report_date;
  if (parsed.data.report_type !== undefined) updateData.report_type = parsed.data.report_type;
  if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
  if (parsed.data.content !== undefined) updateData.content = parsed.data.content;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { data: report, error } = await supabase
    .from("lp_reports")
    .update(updateData)
    .eq("id", reportId)
    .eq("fund_id", id)
    .select("*")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ report, ok: true });
}

// DELETE - Delete LP report
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; reportId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id, reportId } = await params;

  // Verify fund ownership
  const { data: fund } = await supabase
    .from("funds")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!fund) return jsonError("Fund not found.", 404);

  // Verify report belongs to this fund
  const { data: existing } = await supabase
    .from("lp_reports")
    .select("id")
    .eq("id", reportId)
    .eq("fund_id", id)
    .single();

  if (!existing) return jsonError("Report not found.", 404);

  const { error } = await supabase
    .from("lp_reports")
    .delete()
    .eq("id", reportId)
    .eq("fund_id", id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

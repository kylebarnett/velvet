import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { logger } from "@/lib/logger";

const updateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]).optional(),
  year: z.number().int().min(2000).max(2100).optional(),
  status: z.enum(["draft", "published"]).optional(),
  content: z.record(z.string(), z.unknown()).optional(),
});

// GET - Get a single investor tear sheet
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  const { data: tearSheet, error } = await supabase
    .from("tear_sheets")
    .select("*, companies(name)")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error || !tearSheet) {
    return jsonError("Tear sheet not found.", 404);
  }

  const company = Array.isArray(tearSheet.companies) ? tearSheet.companies[0] : tearSheet.companies;
  return NextResponse.json({
    tearSheet: {
      ...tearSheet,
      companyName: company?.name ?? null,
      companies: undefined,
    },
  });
}

// PUT - Update an investor tear sheet
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  // Verify ownership
  const { data: existing } = await supabase
    .from("tear_sheets")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("Tear sheet not found.", 404);
  }

  const { title, quarter, year, status, content } = parsed.data;

  const updateData: Record<string, unknown> = {};
  if (title !== undefined) updateData.title = title;
  if (quarter !== undefined) updateData.quarter = quarter;
  if (year !== undefined) updateData.year = year;
  if (status !== undefined) updateData.status = status;
  if (content !== undefined) updateData.content = content;

  if (Object.keys(updateData).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { data: tearSheet, error } = await supabase
    .from("tear_sheets")
    .update(updateData)
    .eq("id", id)
    .eq("investor_id", user.id)
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(
        "A tear sheet for this quarter already exists for this company.",
        409,
      );
    }
    logger.error("Investor tear sheet update error:", error);
    return jsonError("Failed to update tear sheet.", 500);
  }

  return NextResponse.json({ tearSheet, ok: true });
}

// DELETE - Delete an investor tear sheet
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  const { id } = await params;

  // Verify ownership
  const { data: existing } = await supabase
    .from("tear_sheets")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("Tear sheet not found.", 404);
  }

  const { error } = await supabase
    .from("tear_sheets")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) {
    logger.error("Investor tear sheet delete error:", error);
    return jsonError("Failed to delete tear sheet.", 500);
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Get a single saved report by ID
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;

  const { data: report, error } = await supabase
    .from("portfolio_reports")
    .select("*")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonError("Report not found.", 404);
    }
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ report });
}

// PUT - Update a saved report
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;
  const body = await req.json();

  // Verify ownership
  const { data: existing } = await supabase
    .from("portfolio_reports")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (!existing) {
    return jsonError("Report not found.", 404);
  }

  // Build update object with only provided fields
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || body.name.trim().length === 0) {
      return jsonError("Report name cannot be empty.", 400);
    }
    updates.name = body.name.trim();
  }

  if (body.description !== undefined) {
    updates.description = body.description?.trim() || null;
  }

  if (body.filters !== undefined) {
    updates.filters = body.filters;
  }

  if (body.companyIds !== undefined) {
    updates.company_ids = body.companyIds;
  }

  if (body.normalize !== undefined) {
    if (!["absolute", "indexed", "percentChange"].includes(body.normalize)) {
      return jsonError("Invalid normalize value.", 400);
    }
    updates.normalize = body.normalize;
  }

  if (body.config !== undefined) {
    updates.config = body.config;
  }

  if (body.isDefault !== undefined) {
    updates.is_default = body.isDefault;
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No updates provided.", 400);
  }

  const { data: report, error } = await supabase
    .from("portfolio_reports")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ report, ok: true });
}

// DELETE - Delete a saved report
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { id } = await params;

  // Verify ownership and delete
  const { error } = await supabase
    .from("portfolio_reports")
    .delete()
    .eq("id", id)
    .eq("investor_id", user.id);

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const updateSchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) return jsonError("Not a member of this organization.", 403);

  const { data: org } = await supabase
    .from("organizations")
    .select("id, name, org_type, owner_id, created_at")
    .eq("id", id)
    .single();

  if (!org) return jsonError("Organization not found.", 404);

  return NextResponse.json({ organization: org, myRole: membership.role });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return jsonError("Only admins can update the organization.", 403);
  }

  const admin = createSupabaseAdminClient();
  const { error } = await admin
    .from("organizations")
    .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Only owner can delete
  const { data: org } = await supabase
    .from("organizations")
    .select("owner_id")
    .eq("id", id)
    .single();

  if (!org) return jsonError("Organization not found.", 404);
  if (org.owner_id !== user.id) {
    return jsonError("Only the owner can delete the organization.", 403);
  }

  const admin = createSupabaseAdminClient();

  // Clear organization_id from related tables
  await admin
    .from("companies")
    .update({ organization_id: null })
    .eq("organization_id", id);

  await admin
    .from("investor_company_relationships")
    .update({ organization_id: null })
    .eq("organization_id", id);

  // Delete org (cascades to members and invitations)
  const { error } = await admin
    .from("organizations")
    .delete()
    .eq("id", id);

  if (error) return jsonError(error.message, 400);

  return NextResponse.json({ ok: true });
}

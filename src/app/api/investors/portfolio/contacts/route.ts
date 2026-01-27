import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - List all contacts for investor
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { data, error } = await supabase
    .from("portfolio_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      status,
      invite_token,
      sent_at,
      accepted_at,
      created_at,
      company_id,
      companies (
        id,
        name,
        founder_id
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ contacts: data });
}

// PUT - Update contact info
const updateSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
});

export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { id, ...updates } = parsed.data;

  // Only update if there's something to update
  if (Object.keys(updates).length === 0) {
    return jsonError("No fields to update.", 400);
  }

  const { data, error } = await supabase
    .from("portfolio_invitations")
    .update(updates)
    .eq("id", id)
    .eq("investor_id", user.id)
    .select()
    .single();

  if (error) {
    return jsonError(error.message, 500);
  }

  return NextResponse.json({ contact: data });
}

// DELETE - Remove contact, company, and relationship
const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { id } = parsed.data;

  // First get the invitation to find the company_id
  const { data: invitation, error: fetchError } = await supabase
    .from("portfolio_invitations")
    .select("company_id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !invitation) {
    return jsonError("Contact not found.", 404);
  }

  // Use admin client to delete related records
  const adminClient = createSupabaseAdminClient();

  // Delete in order: invitation -> relationship -> company
  await adminClient.from("portfolio_invitations").delete().eq("id", id);
  await adminClient
    .from("investor_company_relationships")
    .delete()
    .eq("company_id", invitation.company_id)
    .eq("investor_id", user.id);
  await adminClient.from("companies").delete().eq("id", invitation.company_id);

  return NextResponse.json({ ok: true });
}

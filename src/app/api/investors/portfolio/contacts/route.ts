import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// GET - List contacts for investor with pagination and search
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Parse query params
  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const search = url.searchParams.get("search")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const sortField = url.searchParams.get("sortField") ?? "company";
  const sortDir = url.searchParams.get("sortDir") ?? "asc";

  // Calculate offset
  const offset = (page - 1) * limit;

  // Build base query for counting
  let countQuery = supabase
    .from("portfolio_invitations")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id);

  // Build data query
  let dataQuery = supabase
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
    .eq("investor_id", user.id);

  // Apply status filter
  const validStatuses = ["pending", "sent", "accepted"];
  if (status && validStatuses.includes(status)) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }

  // Apply search filter (server-side ILIKE search)
  if (search) {
    // Escape special characters for ILIKE pattern and PostgREST filter syntax
    // First escape ILIKE wildcards, then escape characters that break PostgREST filter parsing
    const escapedSearch = search
      .replace(/[%_]/g, "\\$&")  // Escape ILIKE wildcards
      .replace(/[(),."'\\]/g, ""); // Remove chars that could break PostgREST syntax

    // Only search if there's something left after sanitization
    if (escapedSearch.trim()) {
      const searchPattern = `%${escapedSearch.trim()}%`;

      // Search across first_name, last_name, and email
      countQuery = countQuery.or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`
      );
      dataQuery = dataQuery.or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`
      );
    }
  }

  // Get total count
  const { count: totalCount, error: countError } = await countQuery;
  if (countError) {
    return jsonError(countError.message, 500);
  }

  // Apply database-level sorting
  const ascending = sortDir !== "desc";
  switch (sortField) {
    case "contact":
      dataQuery = dataQuery.order("last_name", { ascending }).order("first_name", { ascending });
      break;
    case "email":
      dataQuery = dataQuery.order("email", { ascending });
      break;
    case "status":
      dataQuery = dataQuery.order("status", { ascending });
      break;
    case "company":
    default:
      // Sort by company name via foreign table
      dataQuery = dataQuery.order("name", { referencedTable: "companies", ascending });
      break;
  }

  // Apply database-level pagination
  dataQuery = dataQuery.range(offset, offset + limit - 1);

  const { data, error } = await dataQuery;

  if (error) {
    return jsonError(error.message, 500);
  }

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    contacts: data ?? [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
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

  // First get the invitation and company info
  const { data: invitation, error: fetchError } = await supabase
    .from("portfolio_invitations")
    .select("company_id, companies(founder_id)")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !invitation) {
    return jsonError("Contact not found.", 404);
  }

  // Use admin client to delete related records
  const adminClient = createSupabaseAdminClient();

  // Delete invitation and relationship
  await adminClient.from("portfolio_invitations").delete().eq("id", id);
  await adminClient
    .from("investor_company_relationships")
    .delete()
    .eq("company_id", invitation.company_id)
    .eq("investor_id", user.id);

  // Only delete company if no founder has signed up AND no other investors are linked
  const companiesRaw = invitation.companies;
  const company = (Array.isArray(companiesRaw) ? companiesRaw[0] : companiesRaw) as { founder_id: string | null } | null;
  if (!company?.founder_id) {
    const { count } = await adminClient
      .from("investor_company_relationships")
      .select("id", { count: "exact", head: true })
      .eq("company_id", invitation.company_id);

    if (!count || count === 0) {
      await adminClient.from("companies").delete().eq("id", invitation.company_id);
    }
  }

  return NextResponse.json({ ok: true });
}

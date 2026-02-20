import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

type ContactRow = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  position: string | null;
  status: string;
  invite_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  company_id: string;
  companies: { id: string; name: string; founder_id: string | null } | { id: string; name: string; founder_id: string | null }[] | null;
};

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const url = new URL(req.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const search = (url.searchParams.get("search")?.trim() ?? "").slice(0, 100);
  const status = url.searchParams.get("status") ?? "";
  const sortField = url.searchParams.get("sortField") ?? "company";
  const sortDir = url.searchParams.get("sortDir") ?? "asc";

  const offset = (page - 1) * limit;

  let countQuery = supabase
    .from("portfolio_invitations")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id);

  let dataQuery = supabase
    .from("portfolio_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      position,
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

  const validStatuses = ["pending", "sent", "accepted"];
  if (status && validStatuses.includes(status)) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }

  if (search) {
    const escapedSearch = search
      .replace(/[%_]/g, "\\$&")
      .replace(/[(),."'\\]/g, "");

    if (escapedSearch.trim()) {
      const searchPattern = `%${escapedSearch.trim()}%`;

      countQuery = countQuery.or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`
      );
      dataQuery = dataQuery.or(
        `first_name.ilike.${searchPattern},last_name.ilike.${searchPattern},email.ilike.${searchPattern}`
      );
    }
  }

  const { count: totalCount, error: countError } = await countQuery;
  if (countError) {
    logger.error("Failed to count contacts:", countError.message);
    return jsonError("Failed to process request.", 500);
  }

  const ascending = sortDir !== "desc";
  const sortByCompany = sortField === "company" || !sortField;

  // Supabase referencedTable ordering is unreliable for joined columns, so
  // when sorting by company name we fetch all matching rows, sort in-memory,
  // then slice to the requested page.
  if (!sortByCompany) {
    switch (sortField) {
      case "contact":
        dataQuery = dataQuery.order("last_name", { ascending }).order("first_name", { ascending });
        break;
      case "position":
        dataQuery = dataQuery.order("position", { ascending, nullsFirst: false });
        break;
      case "email":
        dataQuery = dataQuery.order("email", { ascending });
        break;
      case "status":
        dataQuery = dataQuery.order("status", { ascending });
        break;
    }
    // Tiebreaker for deterministic pagination
    dataQuery = dataQuery.order("id", { ascending: true });
    dataQuery = dataQuery.range(offset, offset + limit - 1);
  }

  const { data, error } = await dataQuery;

  if (error) {
    logger.error("Failed to fetch contacts:", error.message);
    return jsonError("Failed to process request.", 500);
  }

  let results = (data ?? []) as ContactRow[];

  if (sortByCompany) {
    const getCompanyName = (row: ContactRow): string =>
      (Array.isArray(row.companies) ? row.companies[0]?.name : row.companies?.name) ?? "";

    results.sort((a, b) => {
      const cmp = getCompanyName(a).localeCompare(getCompanyName(b), undefined, { sensitivity: "base" });
      return ascending ? cmp : -cmp;
    });
    results = results.slice(offset, offset + limit);
  }

  const total = totalCount ?? 0;
  const totalPages = Math.ceil(total / limit);

  return NextResponse.json({
    contacts: results,
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}

const updateSchema = z.object({
  id: z.string().uuid(),
  first_name: z.string().min(1).optional(),
  last_name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  position: z.string().optional(),
});

export async function PUT(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { id, ...updates } = parsed.data;

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
    logger.error("Failed to update contact:", error.message);
    return jsonError("Failed to process request.", 500);
  }

  return NextResponse.json({ contact: data });
}

const deleteSchema = z.object({
  id: z.string().uuid(),
});

export async function DELETE(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = deleteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { id } = parsed.data;

  const { data: invitation, error: fetchError } = await supabase
    .from("portfolio_invitations")
    .select("company_id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !invitation) {
    return jsonError("Contact not found.", 404);
  }

  // Admin client used after ownership verification above
  const adminClient = createSupabaseAdminClient();

  // Only delete the invitation — keep the company and relationship intact
  await adminClient.from("portfolio_invitations").delete().eq("id", id);

  return NextResponse.json({ ok: true });
}

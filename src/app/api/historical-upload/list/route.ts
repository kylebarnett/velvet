import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";

// GET - List past uploads for the current user
export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const url = new URL(req.url);
  const { limit, offset } = parsePagination(url);

  let query = supabase
    .from("historical_uploads")
    .select("*", { count: "exact" })
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);

  // Optional status filter
  const statusParam = url.searchParams.get("status");
  if (statusParam) {
    query = query.eq("status", statusParam);
  }

  // Optional company filter: find uploads that have values for a specific company
  const companyId = url.searchParams.get("companyId");
  if (companyId) {
    // Filter uploads that have values for this company
    const { data: uploadIds } = await supabase
      .from("historical_upload_values")
      .select("upload_id")
      .eq("company_id", companyId);

    const ids = [...new Set((uploadIds ?? []).map((r) => r.upload_id))];
    if (ids.length === 0) {
      return NextResponse.json({ uploads: [], total: 0, limit, offset });
    }
    query = query.in("id", ids);
  }

  const { data: uploads, count, error } = await query;

  if (error) {
    return jsonError("Failed to fetch uploads.", 500);
  }

  return NextResponse.json({
    uploads: uploads ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}

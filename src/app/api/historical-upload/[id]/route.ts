import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { parsePagination } from "@/lib/api/pagination";

// GET - Get upload details + paginated parsed values
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor" && role !== "founder") {
    return jsonError("Forbidden.", 403);
  }

  const { id: uploadId } = await params;

  // Verify ownership
  const { data: upload } = await supabase
    .from("historical_uploads")
    .select("*")
    .eq("id", uploadId)
    .eq("user_id", user.id)
    .single();

  if (!upload) return jsonError("Upload not found.", 404);

  // Parse query params for filtering/pagination
  const url = new URL(req.url);
  const { limit, offset } = parsePagination(url);
  const statusFilter = url.searchParams.get("status");
  const searchQuery = url.searchParams.get("search")?.slice(0, 100) ?? null;
  const companyIdFilter = url.searchParams.get("companyId");

  // Build query for values
  let query = supabase
    .from("historical_upload_values")
    .select("*", { count: "exact" })
    .eq("upload_id", uploadId)
    .order("company_name_detected", { ascending: true, nullsFirst: false })
    .order("metric_name", { ascending: true })
    .order("period_start", { ascending: false })
    .range(offset, offset + limit - 1);

  if (statusFilter && ["pending", "approved", "rejected", "conflict"].includes(statusFilter)) {
    query = query.eq("status", statusFilter);
  }

  if (companyIdFilter) {
    query = query.eq("company_id", companyIdFilter);
  }

  if (searchQuery) {
    // Escape ILIKE wildcards
    const escaped = searchQuery
      .replace(/%/g, "\\%")
      .replace(/_/g, "\\_");
    query = query.ilike("metric_name", `%${escaped}%`);
  }

  const { data: values, count, error } = await query;

  if (error) {
    return jsonError("Failed to fetch upload values.", 500);
  }

  // Get company mapping summary
  const { data: companySummary } = await supabase
    .from("historical_upload_values")
    .select("company_name_detected, company_id")
    .eq("upload_id", uploadId)
    .not("company_name_detected", "is", null);

  // Deduplicate company names
  const companyMap = new Map<string, string | null>();
  for (const row of companySummary ?? []) {
    if (row.company_name_detected && !companyMap.has(row.company_name_detected)) {
      companyMap.set(row.company_name_detected, row.company_id);
    }
  }

  const companies = Array.from(companyMap.entries()).map(([name, id]) => ({
    detectedName: name,
    companyId: id,
  }));

  return NextResponse.json({
    upload,
    values: values ?? [],
    companies,
    total: count ?? 0,
    limit,
    offset,
  });
}

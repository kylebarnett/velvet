import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Distinct metric names across all approved portfolio companies
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Get approved company IDs
  const { data: relationships, error: relError } = await supabase
    .from("investor_company_relationships")
    .select("company_id")
    .eq("investor_id", user.id)
    .in("approval_status", ["auto_approved", "approved"]);

  if (relError) return jsonError(relError.message, 500);

  const companyIds = (relationships ?? []).map((r) => r.company_id);

  if (companyIds.length === 0) {
    return NextResponse.json({ metricNames: [] });
  }

  // Get distinct metric names from company_metric_values
  const { data: metricRows, error: mvError } = await supabase
    .from("company_metric_values")
    .select("metric_name")
    .in("company_id", companyIds);

  if (mvError) return jsonError(mvError.message, 500);

  // Deduplicate and sort metric names (case-insensitive, preserve original casing)
  const nameMap = new Map<string, string>();
  for (const row of metricRows ?? []) {
    const normalized = row.metric_name.toLowerCase().trim();
    if (!nameMap.has(normalized)) {
      nameMap.set(normalized, row.metric_name.trim());
    }
  }

  const metricNames = [...nameMap.values()].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );

  return NextResponse.json(
    { metricNames },
    {
      headers: {
        "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
      },
    }
  );
}

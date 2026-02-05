import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const querySchema = z.object({
  companyId: z.string().uuid(),
  metricName: z.string().min(1),
});

export async function GET(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  const url = new URL(req.url);
  const parsed = querySchema.safeParse({
    companyId: url.searchParams.get("companyId"),
    metricName: url.searchParams.get("metricName"),
  });

  if (!parsed.success) return jsonError("Missing companyId or metricName.", 400);

  const { companyId, metricName } = parsed.data;

  // Verify access based on role
  if (role === "investor") {
    const { data: rel } = await supabase
      .from("investor_company_relationships")
      .select("id, approval_status")
      .eq("investor_id", user.id)
      .eq("company_id", companyId)
      .single();

    if (!rel) return jsonError("Company not in portfolio.", 403);
    if (rel.approval_status !== "approved" && rel.approval_status !== "auto_approved") {
      return jsonError("Not approved for this company.", 403);
    }
  } else if (role === "founder") {
    const { data: company } = await supabase
      .from("companies")
      .select("id")
      .eq("id", companyId)
      .eq("founder_id", user.id)
      .single();

    if (!company) return jsonError("Not authorized.", 403);
  } else {
    return jsonError("Forbidden.", 403);
  }

  // Fetch all values for this metric across periods
  const { data: values } = await supabase
    .from("company_metric_values")
    .select(
      "id, metric_name, period_type, period_start, period_end, value, notes, source, source_document_id, ai_confidence, submitted_at, submitted_by",
    )
    .eq("company_id", companyId)
    .eq("metric_name", metricName)
    .order("period_start", { ascending: true });

  // Fetch history for these values
  const valueIds = (values ?? []).map((v) => v.id);
  let history: Array<{
    id: string;
    metric_value_id: string;
    previous_value: unknown;
    new_value: unknown;
    previous_source: string | null;
    new_source: string | null;
    changed_by: string | null;
    change_reason: string | null;
    created_at: string;
  }> = [];

  if (valueIds.length > 0) {
    const { data: historyData } = await supabase
      .from("metric_value_history")
      .select("*")
      .in("metric_value_id", valueIds)
      .order("created_at", { ascending: false });
    history = historyData ?? [];
  }

  // Resolve changed_by UUIDs to user names
  const changedByIds = [
    ...new Set(
      history
        .map((h) => h.changed_by)
        .filter((id): id is string => id != null),
    ),
  ];

  let enrichedHistory = history;
  if (changedByIds.length > 0) {
    // Use admin client to read users table (bypasses RLS)
    // Ownership verified above via role-based company access check
    const admin = createSupabaseAdminClient();
    const { data: users } = await admin
      .from("users")
      .select("id, full_name, email")
      .in("id", changedByIds);

    const userMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        u.full_name || u.email || "Unknown user",
      ]),
    );

    enrichedHistory = history.map((h) => ({
      ...h,
      changed_by_name: h.changed_by ? userMap.get(h.changed_by) ?? null : null,
    }));
  }

  // Fetch linked documents if any
  const docIds = (values ?? [])
    .map((v) => v.source_document_id)
    .filter((id): id is string => id != null);

  let documents: Array<{ id: string; file_name: string; document_type: string }> = [];
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, document_type")
      .in("id", [...new Set(docIds)]);
    documents = docs ?? [];
  }

  return NextResponse.json({
    metricName,
    companyId,
    values: values ?? [],
    history: enrichedHistory,
    documents,
  });
}

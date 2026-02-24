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

  const role = user.app_metadata?.role;
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
      .select("id, metric_value_id, previous_value, new_value, previous_source, new_source, changed_by, change_reason, created_at")
      .in("metric_value_id", valueIds)
      .order("created_at", { ascending: false });
    history = historyData ?? [];
  }

  // Resolve changed_by and submitted_by UUIDs to user names.
  // Use admin client to read users table (bypasses RLS).
  // Ownership verified above via role-based company access check.
  const changedByIds = history
    .map((h) => h.changed_by)
    .filter((id): id is string => id != null);
  const submittedByIds = (values ?? [])
    .map((v) => v.submitted_by)
    .filter((id): id is string => id != null);
  const allUserIds = [...new Set([...changedByIds, ...submittedByIds])];

  let userMap = new Map<string, string>();
  if (allUserIds.length > 0) {
    const admin = createSupabaseAdminClient();
    const { data: users } = await admin
      .from("users")
      .select("id, full_name, email")
      .in("id", allUserIds);

    userMap = new Map(
      (users ?? []).map((u) => [
        u.id,
        u.full_name || u.email || "Unknown user",
      ]),
    );
  }

  const enrichedHistory = history.map((h) => ({
    ...h,
    changed_by_name: h.changed_by ? userMap.get(h.changed_by) ?? null : null,
  }));

  // Attach submitter name to each value
  const enrichedValues = (values ?? []).map((v) => ({
    ...v,
    submitted_by_name: v.submitted_by ? userMap.get(v.submitted_by) ?? null : null,
  }));

  // Fetch linked documents if any
  const docIds = (values ?? [])
    .map((v) => v.source_document_id)
    .filter((id): id is string => id != null);

  let documents: Array<{
    id: string;
    file_name: string;
    file_path: string;
    file_type: string | null;
    file_size: number;
    document_type: string;
    description: string | null;
    uploaded_at: string;
  }> = [];
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from("documents")
      .select("id, file_name, file_path, file_type, file_size, document_type, description, uploaded_at")
      .in("id", [...new Set(docIds)]);
    documents = docs ?? [];
  }

  return NextResponse.json({
    metricName,
    companyId,
    values: enrichedValues,
    history: enrichedHistory,
    documents,
  },
  {
    headers: {
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Founder's company metric submission history
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  const { data: values, error } = await supabase
    .from("company_metric_values")
    .select("id, metric_name, period_type, period_start, period_end, value, notes, submitted_at, updated_at")
    .eq("company_id", company.id)
    .order("submitted_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ companyId: company.id, metrics: values ?? [] });
}

import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";

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

  if (!company) {
    return NextResponse.json({ count: 0 });
  }

  // Count pending requests
  const { count, error } = await supabase
    .from("metric_requests")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id)
    .eq("status", "pending");

  if (error) {
    console.error("Notification count error:", error);
    return jsonError("Failed to load notification count.", 500);
  }

  return NextResponse.json({ count: count ?? 0 });
}

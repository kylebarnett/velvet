import { NextResponse } from "next/server";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List dashboard templates
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Fetch all system templates
  const { data: templates, error } = await supabase
    .from("dashboard_templates")
    .select("id, name, description, target_industry, layout, is_system, created_at")
    .eq("is_system", true)
    .order("name", { ascending: true });

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({
    templates: templates ?? [],
  }, {
    headers: {
      "Cache-Control": "private, max-age=60, stale-while-revalidate=120",
    },
  });
}

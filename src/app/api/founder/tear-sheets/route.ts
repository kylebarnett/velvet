import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const createSchema = z.object({
  title: z.string().min(1).max(200),
  quarter: z.enum(["Q1", "Q2", "Q3", "Q4"]),
  year: z.number().int().min(2000).max(2100),
  content: z.record(z.string(), z.unknown()).default({}),
});

// GET - List tear sheets for founder's company
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

  const { data: tearSheets, error } = await supabase
    .from("tear_sheets")
    .select("*")
    .eq("founder_id", user.id)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (error) {
    console.error("Tear sheet list error:", error);
    return jsonError("Failed to load tear sheets.", 500);
  }

  return NextResponse.json({ tearSheets: tearSheets ?? [] });
}

// POST - Create a tear sheet
export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const { title, quarter, year, content } = parsed.data;

  // Verify company ownership
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  const { data: tearSheet, error } = await supabase
    .from("tear_sheets")
    .insert({
      company_id: company.id,
      founder_id: user.id,
      title,
      quarter,
      year,
      content,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return jsonError(
        "A tear sheet for this quarter already exists.",
        409,
      );
    }
    console.error("Tear sheet create error:", error);
    return jsonError("Failed to create tear sheet.", 500);
  }

  return NextResponse.json({ tearSheet, ok: true }, { status: 201 });
}

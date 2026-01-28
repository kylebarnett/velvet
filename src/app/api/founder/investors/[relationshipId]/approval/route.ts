import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

const schema = z.object({
  status: z.enum(["approved", "denied"]),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ relationshipId: string }> },
) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "founder") return jsonError("Founders only.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { relationshipId } = await params;

  // Get founder's company
  const { data: company } = await supabase
    .from("companies")
    .select("id")
    .eq("founder_id", user.id)
    .single();

  if (!company) return jsonError("No company found.", 404);

  // Verify the relationship belongs to the founder's company
  const { data: relationship, error: fetchError } = await supabase
    .from("investor_company_relationships")
    .select("id, company_id, approval_status")
    .eq("id", relationshipId)
    .eq("company_id", company.id)
    .single();

  if (fetchError || !relationship) {
    return jsonError("Relationship not found.", 404);
  }

  // Don't allow changing auto_approved status
  if (relationship.approval_status === "auto_approved") {
    return jsonError("Cannot change auto-approved investor status.", 400);
  }

  const { error: updateError } = await supabase
    .from("investor_company_relationships")
    .update({ approval_status: parsed.data.status })
    .eq("id", relationshipId);

  if (updateError) return jsonError(updateError.message, 500);

  return NextResponse.json({ ok: true });
}

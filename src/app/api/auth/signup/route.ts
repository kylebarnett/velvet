import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["investor", "founder"]),
  fullName: z.string().min(2),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  inviteToken: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, response } = createSupabaseRouteHandlerClient(request);
  const { email, password, role, fullName, companyName, companyWebsite, inviteToken } =
    parsed.data;

  const adminClient = createSupabaseAdminClient();

  // Check for invite token
  let invitation: {
    id: string;
    company_id: string;
    status: string;
  } | null = null;

  if (inviteToken) {
    const { data: inviteData } = await adminClient
      .from("portfolio_invitations")
      .select("id, company_id, status")
      .eq("invite_token", inviteToken)
      .single();

    if (inviteData && inviteData.status !== "accepted") {
      invitation = inviteData;
    }
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role, full_name: fullName },
    },
  });
  if (error) return jsonError(error.message, 400);

  // Check for duplicate email (Supabase returns empty identities array for existing emails)
  if (data.user && data.user.identities?.length === 0) {
    return jsonError("An account with this email already exists.", 400);
  }

  // Handle invited founder signup
  if (invitation && data.user && role === "founder") {
    // Link founder to existing company
    const { error: companyUpdateError } = await adminClient
      .from("companies")
      .update({ founder_id: data.user.id })
      .eq("id", invitation.company_id);

    if (companyUpdateError) {
      console.error("Failed to link founder to company:", companyUpdateError);
    }

    // Update invitation status
    const { error: inviteUpdateError } = await adminClient
      .from("portfolio_invitations")
      .update({
        status: "accepted",
        accepted_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (inviteUpdateError) {
      console.error("Failed to update invitation status:", inviteUpdateError);
    }
  } else if (role === "founder" && companyName && data.user) {
    // Create new company record for founders without invite
    const { error: companyError } = await adminClient.from("companies").insert({
      name: companyName,
      website: companyWebsite || null,
      founder_id: data.user.id,
    });
    if (companyError) {
      console.error("Failed to create company record:", companyError);
    }
  }

  return NextResponse.json({ ok: true }, { headers: response.headers });
}


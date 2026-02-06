import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { jsonError } from "@/lib/api/auth";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseRouteHandlerClient } from "@/lib/supabase/route-handler";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["investor", "founder"]),
  fullName: z.string().min(2),
  companyName: z.string().optional(),
  companyWebsite: z.string().optional(),
  companyId: z.string().uuid().optional(),
  inviteToken: z.string().uuid().optional(),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, retryAfter } = checkRateLimit(`signup:${ip}`, 5, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
  }

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
    email: string;
  } | null = null;

  if (inviteToken) {
    const { data: inviteData } = await adminClient
      .from("portfolio_invitations")
      .select("id, company_id, status, email")
      .eq("invite_token", inviteToken)
      .single();

    // Verify token exists, not already accepted, AND email matches
    if (inviteData && inviteData.status !== "accepted") {
      if (inviteData.email.toLowerCase() !== email.toLowerCase()) {
        return jsonError("Email does not match invitation.", 400);
      }
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

  // Wait for the trigger to create the public.users row
  // Uses exponential backoff: 50, 100, 200, 400, 800, 1600ms (total ~3.15s max)
  if (data.user) {
    let delay = 50;
    for (let attempt = 0; attempt < 6; attempt++) {
      const { data: userRow } = await adminClient
        .from("users")
        .select("id")
        .eq("id", data.user.id)
        .single();

      if (userRow) break;

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  // Handle invited founder signup
  if (invitation && data.user && role === "founder") {
    // Link founder to existing company and optionally update website
    const updateData: { founder_id: string; website?: string } = {
      founder_id: data.user.id,
    };
    if (companyWebsite) {
      updateData.website = companyWebsite;
    }

    const { error: companyUpdateError } = await adminClient
      .from("companies")
      .update(updateData)
      .eq("id", invitation.company_id);

    if (companyUpdateError) {
      console.error("Failed to link founder to company:", companyUpdateError);
      return jsonError("Account created but failed to link company. Please contact support.", 500);
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

    // Auto-approve the inviting investor's relationship
    const { error: approvalError } = await adminClient
      .from("investor_company_relationships")
      .update({
        approval_status: "auto_approved",
        is_inviting_investor: true,
      })
      .eq("company_id", invitation.company_id)
      .eq("is_inviting_investor", true);

    if (approvalError) {
      console.error("Failed to auto-approve inviting investor:", approvalError);
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
      return jsonError("Account created but failed to create company. Please contact support.", 500);
    }
  }

  return NextResponse.json({ ok: true }, { headers: response.headers });
}


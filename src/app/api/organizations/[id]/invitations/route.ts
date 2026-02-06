import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/utils/html";

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(["admin", "member", "viewer"]).default("member"),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify membership
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", id)
    .eq("user_id", user.id)
    .single();

  if (!membership) return jsonError("Not a member.", 403);

  const { data: invitations } = await supabase
    .from("organization_invitations")
    .select("id, email, role, status, expires_at, created_at")
    .eq("organization_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ invitations: invitations ?? [] });
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: orgId } = await params;
  const parsed = inviteSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  // Verify admin role
  const { data: membership } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", orgId)
    .eq("user_id", user.id)
    .single();

  if (!membership || membership.role !== "admin") {
    return jsonError("Only admins can send invitations.", 403);
  }

  const { email, role } = parsed.data;

  // Check if user with this email already exists
  const admin = createSupabaseAdminClient();
  const { data: existingUser } = await admin
    .from("users")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (existingUser) {
    // Check if already a member of THIS organization
    const { data: existingMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("organization_id", orgId)
      .eq("user_id", existingUser.id)
      .maybeSingle();

    if (existingMember) {
      return jsonError("This person is already a member.", 400);
    }

    // Check if already a member of ANY organization
    const { data: existingOrgMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", existingUser.id)
      .limit(1)
      .maybeSingle();

    if (existingOrgMember) {
      return jsonError("This person already belongs to another organization.", 400);
    }
  }

  // Check for pending invitation to same email
  const { data: existingInvite } = await admin
    .from("organization_invitations")
    .select("id")
    .eq("organization_id", orgId)
    .eq("email", email.toLowerCase())
    .eq("status", "pending")
    .maybeSingle();

  if (existingInvite) {
    return jsonError("An invitation is already pending for this email.", 400);
  }

  // Create invitation
  const { data: invitation, error } = await admin
    .from("organization_invitations")
    .insert({
      organization_id: orgId,
      email: email.toLowerCase(),
      role,
      invited_by: user.id,
    })
    .select("id, token")
    .single();

  if (error) return jsonError(error.message, 400);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";
  const inviteUrl = `${appUrl}/signup?org_invite=${invitation.token}`;

  // Get org name and inviter name for personalized email
  const { data: org } = await admin
    .from("organizations")
    .select("name")
    .eq("id", orgId)
    .single();

  const { data: inviterData } = await admin
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const orgName = org?.name ?? "an organization";
  const inviterName = inviterData?.full_name ?? "A team member";

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .button { display: inline-block; background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
    .footer { margin-top: 40px; font-size: 14px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hi,</p>
    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(orgName)}</strong> on Velvet as a <strong>${escapeHtml(role)}</strong>.</p>
    <p>Velvet is a platform that helps teams manage portfolio metrics efficiently.</p>
    <p>Click below to accept the invitation:</p>
    <a href="${inviteUrl}" class="button">Accept Invitation</a>
    <p>Or copy this link: ${inviteUrl}</p>
    <div class="footer">
      <p>If you have questions, reply to this email.</p>
      <p>Best,<br>The Velvet Team</p>
    </div>
  </div>
</body>
</html>`.trim();

  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Velvet <onboarding@resend.dev>",
          to: [email],
          subject: `You've been invited to join ${orgName} on Velvet`,
          html,
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        console.error("Failed to send org invitation email:", text);
      }
    } catch (err) {
      console.error("Failed to send org invitation email:", err);
    }
  } else {
    console.log(`[DEV] Would send org invite to ${email}: ${inviteUrl}`);
  }

  return NextResponse.json({
    id: invitation.id,
    inviteUrl,
    ok: true,
  });
}

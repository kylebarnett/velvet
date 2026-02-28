import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendEmailBatchWithRetry } from "@/lib/email/retry";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/utils/html";
import { logger } from "@/lib/logger";

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

  // Rate limit: 10 invitations per minute per user
  const { allowed, retryAfter } = checkRateLimit(`org-invite:${user.id}`, 10, 60_000);
  if (!allowed) {
    return jsonError("Too many requests. Try again later.", 429, {
      "Retry-After": String(retryAfter),
    });
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
      logger.info(`[invite] Blocked: ${email} is already a member of org ${orgId}`);
      return jsonError("Unable to send invitation to this email.", 400);
    }

    // Check if already a member of ANY organization
    const { data: existingOrgMember } = await admin
      .from("organization_members")
      .select("id")
      .eq("user_id", existingUser.id)
      .limit(1)
      .maybeSingle();

    if (existingOrgMember) {
      logger.info(`[invite] Blocked: ${email} already belongs to another organization`);
      return jsonError("Unable to send invitation to this email.", 400);
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
    logger.info(`[invite] Blocked: pending invitation already exists for ${email} in org ${orgId}`);
    return jsonError("Unable to send invitation to this email.", 400);
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

  if (error) {
    logger.error("Failed to create invitation:", error.message);
    return jsonError("Failed to process request.", 400);
  }

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
    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(orgName)}</strong> on PostSig as a <strong>${escapeHtml(role)}</strong>.</p>
    <p>PostSig is a platform that helps teams manage portfolio metrics efficiently.</p>
    <p>Click below to accept the invitation:</p>
    <a href="${inviteUrl}" class="button">Accept Invitation</a>
    <p>Or copy this link: ${inviteUrl}</p>
    <div class="footer">
      <p>If you have questions, reply to this email.</p>
      <p>Best,<br>The PostSig Team</p>
    </div>
  </div>
</body>
</html>`.trim();

  const apiKey = process.env.RESEND_API_KEY;
  const fromDomain = process.env.RESEND_FROM_DOMAIN;
  const fromAddr = fromDomain
    ? `PostSig <notifications@${fromDomain}>`
    : "PostSig <onboarding@resend.dev>";

  if (apiKey) {
    await sendEmailBatchWithRetry(apiKey, [
      {
        from: fromAddr,
        to: [email],
        subject: `You've been invited to join ${orgName} on PostSig`,
        html,
      },
    ]);
  } else {
    logger.info(`[DEV] Would send org invite to ${email}: ${inviteUrl}`);
  }

  return NextResponse.json({
    id: invitation.id,
    inviteUrl,
    ok: true,
  });
}

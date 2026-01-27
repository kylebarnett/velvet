import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const schema = z.union([
  z.object({ invitationIds: z.array(z.string().uuid()).min(1) }),
  z.object({ all: z.literal(true) }),
]);

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("Invalid request body.", 400);
  }

  const adminClient = createSupabaseAdminClient();

  // Get investor name for email
  const { data: investorData } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const investorName = investorData?.full_name ?? "An investor";

  // Fetch invitations to send
  let query = supabase
    .from("portfolio_invitations")
    .select(`
      id,
      email,
      first_name,
      last_name,
      invite_token,
      status,
      companies (
        name
      )
    `)
    .eq("investor_id", user.id)
    .in("status", ["pending", "sent"]);

  if ("invitationIds" in parsed.data) {
    query = query.in("id", parsed.data.invitationIds);
  }

  const { data: invitations, error: fetchError } = await query;

  if (fetchError) {
    return jsonError(fetchError.message, 500);
  }

  if (!invitations || invitations.length === 0) {
    return jsonError("No invitations to send.", 400);
  }

  const results: { sent: number; errors: { email: string; message: string }[] } = {
    sent: 0,
    errors: [],
  };

  const apiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  for (const invitation of invitations) {
    const companies = invitation.companies as { name: string }[] | { name: string } | null;
    let companyName = "your company";
    if (Array.isArray(companies)) {
      companyName = companies[0]?.name ?? "your company";
    } else if (companies) {
      companyName = companies.name ?? "your company";
    }
    const inviteUrl = `${baseUrl}/signup?invite=${invitation.invite_token}`;

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
    <p>Hi ${invitation.first_name},</p>

    <p><strong>${investorName}</strong> has added your company <strong>${companyName}</strong> to their portfolio on Velvet.</p>

    <p>Velvet is a platform that helps founders share metrics with their investors efficiently.</p>

    <p>Click below to create your account and get started:</p>

    <a href="${inviteUrl}" class="button">Create Account</a>

    <p>Or copy this link: ${inviteUrl}</p>

    <div class="footer">
      <p>If you have questions, reply to this email.</p>
      <p>Best,<br>The Velvet Team</p>
    </div>
  </div>
</body>
</html>
    `.trim();

    if (!apiKey) {
      // In development without API key, just update status
      console.log(`[DEV] Would send invite to ${invitation.email}: ${inviteUrl}`);
    } else {
      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Velvet <no-reply@velvet.local>",
            to: [invitation.email],
            subject: `You've been invited to Velvet by ${investorName}`,
            html,
          }),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          results.errors.push({
            email: invitation.email,
            message: `Email failed: ${text || res.statusText}`,
          });
          continue;
        }
      } catch (err) {
        results.errors.push({
          email: invitation.email,
          message: err instanceof Error ? err.message : "Failed to send email",
        });
        continue;
      }
    }

    // Update invitation status
    const { error: updateError } = await adminClient
      .from("portfolio_invitations")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .eq("id", invitation.id);

    if (updateError) {
      results.errors.push({
        email: invitation.email,
        message: `Status update failed: ${updateError.message}`,
      });
      continue;
    }

    results.sent++;
  }

  return NextResponse.json(results);
}

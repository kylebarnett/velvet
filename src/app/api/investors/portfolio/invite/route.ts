import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/utils/html";

const schema = z.union([
  z.object({ invitationIds: z.array(z.string().uuid()).min(1) }),
  z.object({ all: z.literal(true) }),
]);

const BATCH_SIZE = 100; // Resend batch API limit

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

  const results: {
    sent: number;
    errors: { email: string; message: string }[];
    inviteLinks?: { email: string; url: string }[];
  } = {
    sent: 0,
    errors: [],
  };

  const isDev = process.env.NODE_ENV === "development";
  const apiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Prepare email data for all invitations
  type EmailData = {
    id: string;
    email: string;
    inviteUrl: string;
    html: string;
  };

  const emailsToSend: EmailData[] = [];

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
    <p>Hi ${escapeHtml(invitation.first_name)},</p>

    <p><strong>${escapeHtml(investorName)}</strong> has added your company <strong>${escapeHtml(companyName)}</strong> to their portfolio on Velvet.</p>

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

    emailsToSend.push({
      id: invitation.id,
      email: invitation.email,
      inviteUrl,
      html,
    });

    // In dev mode, collect invite links for manual testing
    if (isDev) {
      if (!results.inviteLinks) results.inviteLinks = [];
      results.inviteLinks.push({ email: invitation.email, url: inviteUrl });
    }
  }

  // Send emails in batches
  const successfulIds: string[] = [];

  if (!apiKey) {
    // No API key, just log and mark all as sent
    for (const email of emailsToSend) {
      console.log(`[DEV] Would send invite to ${email.email}: ${email.inviteUrl}`);
      successfulIds.push(email.id);
    }
  } else {
    // Process in batches of BATCH_SIZE
    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      const batch = emailsToSend.slice(i, i + BATCH_SIZE);

      // Prepare batch request
      const batchPayload = batch.map((email) => ({
        from: "Velvet <onboarding@resend.dev>",
        to: [email.email],
        subject: `You've been invited to Velvet by ${investorName}`,
        html: email.html,
      }));

      try {
        const res = await fetch("https://api.resend.com/emails/batch", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(batchPayload),
        });

        if (!res.ok) {
          const text = await res.text().catch(() => "");
          if (isDev) {
            // In dev, don't fail - just log and continue
            console.log(`[DEV] Batch email send failed: ${text || res.statusText}`);
            // Mark all as successful anyway in dev
            for (const email of batch) {
              successfulIds.push(email.id);
            }
          } else {
            // In production, mark these as errors
            for (const email of batch) {
              results.errors.push({
                email: email.email,
                message: `Batch send failed: ${text || res.statusText}`,
              });
            }
          }
        } else {
          // Batch succeeded
          const json = await res.json().catch(() => null);
          // Resend returns { data: [{ id: "..." }, ...] } for successful batch
          if (json?.data && Array.isArray(json.data)) {
            for (let j = 0; j < batch.length; j++) {
              if (json.data[j]?.id) {
                successfulIds.push(batch[j].id);
              } else {
                // Individual email in batch failed
                results.errors.push({
                  email: batch[j].email,
                  message: "Email not sent (no ID returned)",
                });
              }
            }
          } else {
            // Assume all succeeded if we got a 200 but unexpected response format
            for (const email of batch) {
              successfulIds.push(email.id);
            }
          }
        }
      } catch (err) {
        if (isDev) {
          console.log(`[DEV] Batch email send error: ${err instanceof Error ? err.message : "Unknown"}`);
          // Mark all as successful anyway in dev
          for (const email of batch) {
            successfulIds.push(email.id);
          }
        } else {
          for (const email of batch) {
            results.errors.push({
              email: email.email,
              message: err instanceof Error ? err.message : "Failed to send email",
            });
          }
        }
      }
    }
  }

  // Batch update invitation statuses
  if (successfulIds.length > 0) {
    const { error: updateError } = await adminClient
      .from("portfolio_invitations")
      .update({
        status: "sent",
        sent_at: new Date().toISOString(),
      })
      .in("id", successfulIds);

    if (updateError) {
      // Log error but don't fail the request
      console.error("Failed to update invitation statuses:", updateError);
    }

    results.sent = successfulIds.length;
  }

  return NextResponse.json(results);
}

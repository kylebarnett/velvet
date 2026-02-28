import { NextResponse } from "next/server";
import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { unwrapJoin } from "@/lib/api/utils";
import { sendEmailBatchWithRetry } from "@/lib/email/retry";
import { escapeHtml } from "@/lib/utils/html";
import { z } from "zod";

const schema = z.object({
  requestIds: z.array(z.string().uuid()).min(1).max(100),
});

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.app_metadata?.role;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Rate limit: 5 reminder batches per minute per user
  const rl = checkRateLimit(`remind:${user.id}`, 5, 60_000);
  if (!rl.allowed) {
    return jsonError("Too many requests. Please try again later.", 429);
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError("Invalid request IDs.", 400);

  const { requestIds } = parsed.data;

  // Fetch pending requests owned by this investor
  const { data: requests, error: fetchError } = await supabase
    .from("metric_requests")
    .select(
      `
      id,
      company_id,
      status,
      period_start,
      period_end,
      metric_definitions!inner(name),
      companies!inner(id, name, founder_email)
    `,
    )
    .eq("investor_id", user.id)
    .eq("status", "pending")
    .in("id", requestIds);

  if (fetchError) return jsonError("Failed to fetch requests.", 500);
  if (!requests || requests.length === 0) {
    return jsonError("No pending requests found.", 404);
  }

  // Group by founder email to send one email per founder
  const byFounder = new Map<
    string,
    { companyName: string; metrics: string[] }
  >();

  for (const r of requests) {
    const company = unwrapJoin(r.companies);
    const def = unwrapJoin(r.metric_definitions);
    if (!company?.founder_email || !def) continue;

    const email = company.founder_email;
    const existing = byFounder.get(email);
    if (existing) {
      if (!existing.metrics.includes(def.name)) {
        existing.metrics.push(def.name);
      }
    } else {
      byFounder.set(email, {
        companyName: company.name,
        metrics: [def.name],
      });
    }
  }

  if (byFounder.size === 0) {
    return jsonError(
      "No founders to remind (no founder emails found).",
      400,
    );
  }

  const investorName =
    user.user_metadata?.full_name || user.email || "An investor";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
  const fromDomain = process.env.RESEND_FROM_DOMAIN;
  const fromAddr = fromDomain
    ? `PostSig <reminders@${fromDomain}>`
    : "PostSig <onboarding@resend.dev>";

  const emails = Array.from(byFounder.entries()).map(([email, info]) => ({
    from: fromAddr,
    to: [email],
    subject: `Reminder: ${info.companyName} metrics requested`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #18181b; padding: 32px;">
        <div style="max-width: 480px; margin: 0 auto; background: #27272a; border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">
          <h2 style="color: #fff; margin: 0 0 8px;">Metric Reminder</h2>
          <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 16px;">
            ${escapeHtml(investorName)} is waiting for the following metrics for <strong style="color: #fff;">${escapeHtml(info.companyName)}</strong>:
          </p>
          <ul style="color: rgba(255,255,255,0.7); font-size: 14px; padding-left: 20px; margin: 0 0 24px;">
            ${info.metrics.map((m) => `<li style="margin-bottom: 4px;">${escapeHtml(m)}</li>`).join("")}
          </ul>
          <a href="${appUrl}/portal/requests" style="display: inline-block; background: #fff; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
            Submit Metrics
          </a>
        </div>
      </div>
    `,
  }));

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      sent: emails.length,
      devMode: true,
      message: `Would send ${emails.length} reminder email(s) (RESEND_API_KEY not set)`,
    });
  }

  const result = await sendEmailBatchWithRetry(apiKey, emails);

  return NextResponse.json({
    sent: result.sent,
    failed: result.failed,
  });
}

import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/utils/html";
import { sendEmailBatchWithRetry } from "@/lib/email/retry";

const BATCH_SIZE = 100;

interface ReminderWithDetails {
  id: string;
  scheduled_for: string;
  metric_requests: {
    id: string;
    status: string;
    due_date: string;
    period_start: string;
    period_end: string;
    companies: {
      id: string;
      name: string;
      founder_id: string;
      users: {
        id: string;
        email: string;
        full_name: string | null;
      } | null;
    } | null;
    metric_definitions: {
      name: string;
    } | null;
    users: {
      id: string;
      full_name: string | null;
    } | null;
  } | null;
}

// POST - Send due reminders (called by Vercel Cron)
export async function POST(req: Request) {
  // Verify cron secret — reject if not configured or mismatched
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const now = new Date();

  // Find all pending reminders that are due
  const { data: reminders, error: fetchError } = await adminClient
    .from("metric_request_reminders")
    .select(`
      id,
      scheduled_for,
      metric_requests (
        id,
        status,
        due_date,
        period_start,
        period_end,
        companies (
          id,
          name,
          founder_id,
          users!companies_founder_id_fkey (
            id,
            email,
            full_name
          )
        ),
        metric_definitions (
          name
        ),
        users!metric_requests_investor_id_fkey (
          id,
          full_name
        )
      )
    `)
    .eq("status", "pending")
    .lte("scheduled_for", now.toISOString())
    .limit(500);

  if (fetchError) {
    console.error("Failed to fetch reminders:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!reminders || reminders.length === 0) {
    return NextResponse.json({ sent: 0, message: "No reminders due" });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  let sent = 0;
  let skipped = 0;
  let cancelled = 0;

  // Group reminders by founder email to batch notifications
  const founderReminders = new Map<
    string,
    {
      email: string;
      founderName: string;
      reminderIds: string[];
      metrics: {
        name: string;
        companyName: string;
        dueDate: string;
        investorName: string;
      }[];
    }
  >();

  for (const rawReminder of reminders) {
    const reminder = rawReminder as unknown as ReminderWithDetails;
    const request = Array.isArray(reminder.metric_requests)
      ? reminder.metric_requests[0]
      : reminder.metric_requests;

    if (!request) {
      // Request was deleted, cancel reminder
      await adminClient
        .from("metric_request_reminders")
        .update({ status: "cancelled", cancelled_at: now.toISOString() })
        .eq("id", reminder.id);
      cancelled++;
      continue;
    }

    // Check if request is still pending
    if (request.status !== "pending") {
      // Request already submitted, cancel reminder
      await adminClient
        .from("metric_request_reminders")
        .update({ status: "cancelled", cancelled_at: now.toISOString() })
        .eq("id", reminder.id);
      cancelled++;
      continue;
    }

    const company = Array.isArray(request.companies)
      ? request.companies[0]
      : request.companies;
    const founder = company?.users
      ? (Array.isArray(company.users) ? company.users[0] : company.users)
      : null;
    const metricDef = Array.isArray(request.metric_definitions)
      ? request.metric_definitions[0]
      : request.metric_definitions;
    const investor = Array.isArray(request.users)
      ? request.users[0]
      : request.users;

    if (!founder?.email || !company || !metricDef) {
      skipped++;
      continue;
    }

    const existing = founderReminders.get(founder.email);
    if (existing) {
      existing.reminderIds.push(reminder.id);
      existing.metrics.push({
        name: metricDef.name,
        companyName: company.name,
        dueDate: request.due_date,
        investorName: investor?.full_name ?? "An investor",
      });
    } else {
      founderReminders.set(founder.email, {
        email: founder.email,
        founderName: founder.full_name ?? "Founder",
        reminderIds: [reminder.id],
        metrics: [
          {
            name: metricDef.name,
            companyName: company.name,
            dueDate: request.due_date,
            investorName: investor?.full_name ?? "An investor",
          },
        ],
      });
    }
  }

  // Send emails
  if (apiKey && founderReminders.size > 0) {
    const emailsToSend = Array.from(founderReminders.values()).map((founder) => {
      // Group by due date
      const byDueDate = new Map<string, typeof founder.metrics>();
      for (const m of founder.metrics) {
        const existing = byDueDate.get(m.dueDate);
        if (existing) {
          existing.push(m);
        } else {
          byDueDate.set(m.dueDate, [m]);
        }
      }

      // Calculate days until earliest due date
      const earliestDue = [...byDueDate.keys()].sort()[0];
      const daysUntilDue = Math.ceil(
        (new Date(earliestDue).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      const metricsList = founder.metrics
        .map(
          (m) =>
            `<li><strong>${escapeHtml(m.name)}</strong> for ${escapeHtml(m.companyName)} (requested by ${escapeHtml(m.investorName)})</li>`
        )
        .join("");

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
    ul { margin: 10px 0; padding-left: 20px; }
    .highlight { background: #fff3cd; padding: 12px 16px; border-radius: 6px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="container">
    <p>Hi ${escapeHtml(founder.founderName)},</p>

    <div class="highlight">
      <strong>Reminder:</strong> You have metrics due ${daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`}.
    </div>

    <p><strong>Pending metrics:</strong></p>
    <ul>${metricsList}</ul>

    <a href="${baseUrl}/portal/requests" class="button">Submit Metrics Now</a>

    <div class="footer">
      <p>Best,<br>The Velvet Team</p>
    </div>
  </div>
</body>
</html>
      `.trim();

      return {
        from: "Velvet <onboarding@resend.dev>",
        to: [founder.email],
        subject: `Reminder: Metrics due ${daysUntilDue === 1 ? "tomorrow" : `in ${daysUntilDue} days`}`,
        html,
        reminderIds: founder.reminderIds,
      };
    });

    // Send in batches with retry
    for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
      const batch = emailsToSend.slice(i, i + BATCH_SIZE);
      const batchPayload = batch.map(({ reminderIds: _ids, ...rest }) => rest);

      const result = await sendEmailBatchWithRetry(apiKey, batchPayload);
      sent += result.sent;

      // Mark reminders as sent if the batch succeeded
      if (result.sent > 0) {
        for (const email of batch) {
          await adminClient
            .from("metric_request_reminders")
            .update({ status: "sent", sent_at: now.toISOString() })
            .in("id", email.reminderIds);
        }
      }
    }
  } else if (!apiKey) {
    // No API key, mark all as sent for development
    for (const founder of founderReminders.values()) {
      await adminClient
        .from("metric_request_reminders")
        .update({ status: "sent", sent_at: now.toISOString() })
        .in("id", founder.reminderIds);
      sent++;
    }
    console.log(`[DEV] Would send ${founderReminders.size} reminder emails`);
  }

  return NextResponse.json({
    sent,
    skipped,
    cancelled,
    total: reminders.length,
  });
}

// GET not allowed — cron endpoints are POST-only
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
}

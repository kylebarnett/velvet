import { NextResponse } from "next/server";
import { addDays } from "date-fns";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  calculateReportingPeriod,
  calculateNextRunAfterCompletion,
  calculateReminderDates,
} from "@/lib/schedules";
import { escapeHtml } from "@/lib/utils/html";

const BATCH_SIZE = 100;

interface TemplateItem {
  metric_name: string;
  period_type: string;
  data_type: string;
}

interface Schedule {
  id: string;
  investor_id: string;
  name: string;
  cadence: "monthly" | "quarterly" | "annual";
  day_of_month: number;
  company_ids: string[] | null;
  include_future_companies: boolean;
  due_days_offset: number;
  reminder_enabled: boolean;
  reminder_days_before_due: number[];
  is_active: boolean;
  metric_templates: {
    id: string;
    name: string;
    metric_template_items: TemplateItem[];
  } | {
    id: string;
    name: string;
    metric_template_items: TemplateItem[];
  }[] | null;
  users: {
    id: string;
    full_name: string | null;
  } | null;
}

// POST - Process all due schedules (called by Vercel Cron)
export async function POST(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const adminClient = createSupabaseAdminClient();
  const now = new Date();

  // Find all active schedules that are due
  const { data: schedules, error: fetchError } = await adminClient
    .from("metric_request_schedules")
    .select(`
      id,
      investor_id,
      name,
      cadence,
      day_of_month,
      company_ids,
      include_future_companies,
      due_days_offset,
      reminder_enabled,
      reminder_days_before_due,
      is_active,
      metric_templates (
        id,
        name,
        metric_template_items (
          metric_name,
          period_type,
          data_type
        )
      ),
      users!metric_request_schedules_investor_id_fkey (
        id,
        full_name
      )
    `)
    .eq("is_active", true)
    .lte("next_run_at", now.toISOString());

  if (fetchError) {
    console.error("Failed to fetch schedules:", fetchError);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!schedules || schedules.length === 0) {
    return NextResponse.json({ processed: 0, message: "No schedules due" });
  }

  const results: {
    scheduleId: string;
    requestsCreated: number;
    emailsSent: number;
    errors: number;
    status: string;
  }[] = [];

  const apiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // Process each schedule
  for (const rawSchedule of schedules) {
    const schedule = rawSchedule as unknown as Schedule;

    const investor = schedule.users;
    const investorName = investor?.full_name ?? "An investor";

    // Calculate reporting period
    const cadence = schedule.cadence;
    const { periodStart, periodEnd } = calculateReportingPeriod(cadence, now);
    const dueDate = addDays(now, schedule.due_days_offset);

    // Get target companies
    let companyIds: string[] = schedule.company_ids || [];

    if (!schedule.company_ids || schedule.company_ids.length === 0) {
      // Get all portfolio companies for this investor
      const { data: relationships, error: relError } = await adminClient
        .from("investor_company_relationships")
        .select("company_id")
        .eq("investor_id", schedule.investor_id);

      if (relError) {
        console.error(`Failed to fetch companies for schedule ${schedule.id}:`, relError);
        continue;
      }

      companyIds = (relationships ?? []).map((r) => r.company_id);
    }

    if (companyIds.length === 0) {
      console.log(`Schedule ${schedule.id} has no companies, skipping`);
      continue;
    }

    // Get template items
    const template = Array.isArray(schedule.metric_templates)
      ? schedule.metric_templates[0]
      : schedule.metric_templates;

    if (!template || !template.metric_template_items || template.metric_template_items.length === 0) {
      console.log(`Schedule ${schedule.id} has no template items, skipping`);
      continue;
    }

    const templateItems = template.metric_template_items;

    // Get companies with founder info
    const { data: companies, error: companyError } = await adminClient
      .from("companies")
      .select(`
        id,
        name,
        founder_id,
        users!companies_founder_id_fkey (
          id,
          email,
          full_name
        )
      `)
      .in("id", companyIds);

    if (companyError) {
      console.error(`Failed to fetch companies for schedule ${schedule.id}:`, companyError);
      continue;
    }

    const errors: { company?: string; metric?: string; message: string }[] = [];
    let requestsCreated = 0;
    let emailsSent = 0;
    const createdRequestIds: string[] = [];

    // Process each company
    for (const company of companies ?? []) {
      const founder = Array.isArray(company.users) ? company.users[0] : company.users;

      // Skip companies without founders
      if (!company.founder_id || !founder) {
        continue;
      }

      // Create metric requests for each template item
      for (const item of templateItems) {
        // Ensure metric definition exists
        const { data: existingDef } = await adminClient
          .from("metric_definitions")
          .select("id")
          .eq("investor_id", schedule.investor_id)
          .eq("name", item.metric_name)
          .eq("period_type", item.period_type)
          .single();

        let metricDefId: string;

        if (existingDef) {
          metricDefId = existingDef.id;
        } else {
          const { data: newDef, error: defError } = await adminClient
            .from("metric_definitions")
            .insert({
              investor_id: schedule.investor_id,
              name: item.metric_name,
              period_type: item.period_type,
              data_type: item.data_type,
            })
            .select("id")
            .single();

          if (defError || !newDef) {
            errors.push({
              company: company.name,
              metric: item.metric_name,
              message: defError?.message ?? "Failed to create metric definition",
            });
            continue;
          }

          metricDefId = newDef.id;
        }

        // Check if request already exists
        const { data: existingRequest } = await adminClient
          .from("metric_requests")
          .select("id")
          .eq("investor_id", schedule.investor_id)
          .eq("company_id", company.id)
          .eq("metric_definition_id", metricDefId)
          .eq("period_start", periodStart.toISOString().split("T")[0])
          .eq("period_end", periodEnd.toISOString().split("T")[0])
          .single();

        if (existingRequest) {
          continue; // Skip duplicate
        }

        // Create metric request
        const { data: newRequest, error: reqError } = await adminClient
          .from("metric_requests")
          .insert({
            investor_id: schedule.investor_id,
            company_id: company.id,
            metric_definition_id: metricDefId,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            due_date: dueDate.toISOString().split("T")[0],
            schedule_id: schedule.id,
          })
          .select("id")
          .single();

        if (reqError) {
          errors.push({
            company: company.name,
            metric: item.metric_name,
            message: reqError.message,
          });
        } else if (newRequest) {
          requestsCreated++;
          createdRequestIds.push(newRequest.id);
        }
      }
    }

    // Create reminders for the created requests
    if (schedule.reminder_enabled && createdRequestIds.length > 0) {
      const reminderDates = calculateReminderDates(
        dueDate,
        schedule.reminder_days_before_due
      );

      for (const requestId of createdRequestIds) {
        for (const reminderDate of reminderDates) {
          await adminClient.from("metric_request_reminders").insert({
            metric_request_id: requestId,
            schedule_id: schedule.id,
            scheduled_for: reminderDate.toISOString(),
          });
        }
      }
    }

    // Group companies by founder for email notifications
    const founderCompanies = new Map<
      string,
      {
        email: string;
        name: string;
        companies: { id: string; name: string }[];
      }
    >();

    for (const company of companies ?? []) {
      const founder = Array.isArray(company.users) ? company.users[0] : company.users;
      if (!founder?.email) continue;

      const existing = founderCompanies.get(founder.id);
      if (existing) {
        existing.companies.push({ id: company.id, name: company.name });
      } else {
        founderCompanies.set(founder.id, {
          email: founder.email,
          name: founder.full_name ?? "Founder",
          companies: [{ id: company.id, name: company.name }],
        });
      }
    }

    // Send notification emails
    if (apiKey && founderCompanies.size > 0 && requestsCreated > 0) {
      const emailsToSend = Array.from(founderCompanies.values()).map((founder) => {
        const companyList = founder.companies
          .map((c) => `<li>${escapeHtml(c.name)}</li>`)
          .join("");

        const metricList = templateItems
          .map((m) => `<li>${escapeHtml(m.metric_name)}</li>`)
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
  </style>
</head>
<body>
  <div class="container">
    <p>Hi ${escapeHtml(founder.name)},</p>

    <p><strong>${escapeHtml(investorName)}</strong> has requested your metrics for the period ending ${periodEnd.toLocaleDateString()}.</p>

    <p><strong>Companies:</strong></p>
    <ul>${companyList}</ul>

    <p><strong>Metrics requested:</strong></p>
    <ul>${metricList}</ul>

    <p><strong>Due date:</strong> ${dueDate.toLocaleDateString()}</p>

    <a href="${baseUrl}/portal/requests" class="button">Submit Metrics</a>

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
          subject: `${investorName} requested your metrics`,
          html,
        };
      });

      // Send in batches
      for (let i = 0; i < emailsToSend.length; i += BATCH_SIZE) {
        const batch = emailsToSend.slice(i, i + BATCH_SIZE);

        try {
          const res = await fetch("https://api.resend.com/emails/batch", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(batch),
          });

          if (res.ok) {
            const json = await res.json().catch(() => null);
            if (json?.data && Array.isArray(json.data)) {
              emailsSent += json.data.filter((d: { id?: string }) => d?.id).length;
            } else {
              emailsSent += batch.length;
            }
          }
        } catch (err) {
          console.error("Email send error:", err);
        }
      }
    }

    // Create run record
    const runStatus =
      errors.length === 0
        ? "success"
        : requestsCreated > 0
          ? "partial"
          : "failed";

    await adminClient.from("scheduled_request_runs").insert({
      schedule_id: schedule.id,
      period_start: periodStart.toISOString().split("T")[0],
      period_end: periodEnd.toISOString().split("T")[0],
      requests_created: requestsCreated,
      emails_sent: emailsSent,
      errors: errors,
      status: runStatus,
      company_ids: companyIds,
    });

    // Update schedule last_run_at and next_run_at
    const nextRunAt = calculateNextRunAfterCompletion(
      cadence,
      schedule.day_of_month,
      now
    );

    await adminClient
      .from("metric_request_schedules")
      .update({
        last_run_at: now.toISOString(),
        next_run_at: nextRunAt.toISOString(),
      })
      .eq("id", schedule.id);

    results.push({
      scheduleId: schedule.id,
      requestsCreated,
      emailsSent,
      errors: errors.length,
      status: runStatus,
    });
  }

  return NextResponse.json({
    processed: results.length,
    results,
  });
}

// Also support GET for easier testing in development
export async function GET(req: Request) {
  return POST(req);
}

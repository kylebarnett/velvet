import { NextResponse } from "next/server";
import { addDays } from "date-fns";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  calculateReportingPeriod,
  calculateNextRunAfterCompletion,
} from "@/lib/schedules";
import { escapeHtml } from "@/lib/utils/html";

const BATCH_SIZE = 100;

interface TemplateItem {
  metric_name: string;
  period_type: string;
  data_type: string;
}

// POST - Manually trigger a schedule run
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Get schedule with template
  const { data: schedule, error: fetchError } = await supabase
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
      )
    `)
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !schedule) {
    return jsonError("Schedule not found.", 404);
  }

  const adminClient = createSupabaseAdminClient();

  // Get investor name for emails
  const { data: investorData } = await supabase
    .from("users")
    .select("full_name")
    .eq("id", user.id)
    .single();

  const investorName = investorData?.full_name ?? "An investor";

  // Calculate reporting period
  const now = new Date();
  const cadence = schedule.cadence as "monthly" | "quarterly" | "annual";
  const { periodStart, periodEnd } = calculateReportingPeriod(cadence, now);
  const dueDate = addDays(now, schedule.due_days_offset);

  // Get target companies
  let companyIds: string[] = schedule.company_ids || [];

  if (!schedule.company_ids || schedule.company_ids.length === 0) {
    // Get all portfolio companies
    const { data: relationships, error: relError } = await supabase
      .from("investor_company_relationships")
      .select("company_id")
      .eq("investor_id", user.id);

    if (relError) {
      return jsonError("Failed to fetch portfolio companies.", 500);
    }

    companyIds = (relationships ?? []).map((r) => r.company_id);
  }

  if (companyIds.length === 0) {
    return jsonError("No companies in portfolio.", 400);
  }

  // Get template items
  const template = Array.isArray(schedule.metric_templates)
    ? schedule.metric_templates[0]
    : schedule.metric_templates;

  if (!template || !template.metric_template_items || template.metric_template_items.length === 0) {
    return jsonError("Template has no metrics.", 400);
  }

  const templateItems = template.metric_template_items as TemplateItem[];

  // Get companies with founder info for emails
  const { data: companies, error: companyError } = await supabase
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
    return jsonError("Failed to fetch company details.", 500);
  }

  const errors: { company?: string; metric?: string; message: string }[] = [];
  let requestsCreated = 0;
  let emailsSent = 0;

  // Process each company
  for (const company of companies ?? []) {
    const founder = Array.isArray(company.users) ? company.users[0] : company.users;

    // Skip companies without founders (not signed up yet)
    if (!company.founder_id || !founder) {
      continue;
    }

    // Create metric requests for each template item
    for (const item of templateItems) {
      // First, ensure metric definition exists (upsert)
      const { data: metricDef, error: defError } = await adminClient
        .from("metric_definitions")
        .upsert(
          {
            investor_id: user.id,
            name: item.metric_name,
            period_type: item.period_type,
            data_type: item.data_type,
          },
          {
            onConflict: "investor_id,name,period_type",
            ignoreDuplicates: false,
          }
        )
        .select("id")
        .single();

      if (defError) {
        // Try to get existing definition
        const { data: existingDef } = await supabase
          .from("metric_definitions")
          .select("id")
          .eq("investor_id", user.id)
          .eq("name", item.metric_name)
          .eq("period_type", item.period_type)
          .single();

        if (!existingDef) {
          errors.push({
            company: company.name,
            metric: item.metric_name,
            message: defError.message,
          });
          continue;
        }

        // Use existing definition
        const metricDefId = existingDef.id;

        // Check if request already exists
        const { data: existingRequest } = await supabase
          .from("metric_requests")
          .select("id")
          .eq("investor_id", user.id)
          .eq("company_id", company.id)
          .eq("metric_definition_id", metricDefId)
          .eq("period_start", periodStart.toISOString().split("T")[0])
          .eq("period_end", periodEnd.toISOString().split("T")[0])
          .single();

        if (existingRequest) {
          continue; // Skip duplicate
        }

        // Create metric request
        const { error: reqError } = await adminClient
          .from("metric_requests")
          .insert({
            investor_id: user.id,
            company_id: company.id,
            metric_definition_id: metricDefId,
            period_start: periodStart.toISOString().split("T")[0],
            period_end: periodEnd.toISOString().split("T")[0],
            due_date: dueDate.toISOString().split("T")[0],
            schedule_id: schedule.id,
          });

        if (reqError) {
          errors.push({
            company: company.name,
            metric: item.metric_name,
            message: reqError.message,
          });
        } else {
          requestsCreated++;
        }
        continue;
      }

      // Check if request already exists
      const { data: existingRequest } = await supabase
        .from("metric_requests")
        .select("id")
        .eq("investor_id", user.id)
        .eq("company_id", company.id)
        .eq("metric_definition_id", metricDef.id)
        .eq("period_start", periodStart.toISOString().split("T")[0])
        .eq("period_end", periodEnd.toISOString().split("T")[0])
        .single();

      if (existingRequest) {
        continue; // Skip duplicate
      }

      // Create metric request
      const { error: reqError } = await adminClient
        .from("metric_requests")
        .insert({
          investor_id: user.id,
          company_id: company.id,
          metric_definition_id: metricDef.id,
          period_start: periodStart.toISOString().split("T")[0],
          period_end: periodEnd.toISOString().split("T")[0],
          due_date: dueDate.toISOString().split("T")[0],
          schedule_id: schedule.id,
        });

      if (reqError) {
        errors.push({
          company: company.name,
          metric: item.metric_name,
          message: reqError.message,
        });
      } else {
        requestsCreated++;
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
  const apiKey = process.env.RESEND_API_KEY;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const isDev = process.env.NODE_ENV === "development";

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
        } else if (isDev) {
          console.log(`[DEV] Email batch send failed: ${res.statusText}`);
          emailsSent += batch.length; // Count as sent in dev
        }
      } catch (err) {
        if (isDev) {
          console.log(`[DEV] Email error: ${err instanceof Error ? err.message : "Unknown"}`);
          emailsSent += batch.length;
        }
      }
    }
  } else if (!apiKey && isDev) {
    emailsSent = founderCompanies.size;
    console.log(`[DEV] Would send ${emailsSent} notification emails`);
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
      next_run_at: schedule.is_active ? nextRunAt.toISOString() : null,
    })
    .eq("id", schedule.id);

  return NextResponse.json({
    ok: true,
    requestsCreated,
    emailsSent,
    errors: errors.length > 0 ? errors : undefined,
    status: runStatus,
  });
}

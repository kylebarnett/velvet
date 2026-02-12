import { NextResponse } from "next/server";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { escapeHtml } from "@/lib/utils/html";
import { sendEmailBatchWithRetry } from "@/lib/email/retry";
import { logger } from "@/lib/logger";

// POST - Send deadline reminder emails to founders (called by Vercel Cron daily)
export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createSupabaseAdminClient();
  const now = new Date();
  let totalSent = 0;

  // Find pending metric requests with due dates
  const { data: pendingRequests, error: fetchError } = await admin
    .from("metric_requests")
    .select(`
      id,
      due_date,
      period_start,
      period_end,
      company_id,
      metric_definition_id
    `)
    .eq("status", "pending")
    .not("due_date", "is", null);

  if (fetchError) {
    logger.error("Failed to fetch pending requests:", fetchError.message);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }

  if (!pendingRequests || pendingRequests.length === 0) {
    return NextResponse.json({ sent: 0, message: "No pending requests with due dates" });
  }

  // Group by company
  const companyRequests = new Map<string, typeof pendingRequests>();
  for (const req of pendingRequests) {
    const list = companyRequests.get(req.company_id) ?? [];
    list.push(req);
    companyRequests.set(req.company_id, list);
  }

  // Batch-fetch company + founder info
  const companyIds = Array.from(companyRequests.keys());
  const { data: companies } = await admin
    .from("companies")
    .select("id, name, founder_id")
    .in("id", companyIds)
    .not("founder_id", "is", null);

  if (!companies || companies.length === 0) {
    return NextResponse.json({ sent: 0, message: "No companies with founders" });
  }

  // Batch-fetch founder emails
  const founderIds = companies.map((c) => c.founder_id).filter(Boolean) as string[];
  const { data: founders } = await admin
    .from("users")
    .select("id, email, full_name")
    .in("id", founderIds);

  const founderMap = new Map(
    (founders ?? []).map((f) => [f.id, f])
  );

  // Batch-fetch metric definition names
  const defIds = [...new Set(pendingRequests.map((r) => r.metric_definition_id))];
  const { data: defs } = await admin
    .from("metric_definitions")
    .select("id, name")
    .in("id", defIds);

  const defMap = new Map((defs ?? []).map((d) => [d.id, d.name]));

  // Check founder preferences for reminder settings
  const { data: preferences } = await admin
    .from("user_preferences")
    .select("user_id, preferences")
    .in("user_id", founderIds);

  const prefMap = new Map(
    (preferences ?? []).map((p) => [p.user_id, p.preferences])
  );

  // Determine which reminders to send
  const reminderThresholds = [
    { type: "7d", days: 7 },
    { type: "3d", days: 3 },
    { type: "1d", days: 1 },
  ];

  const emailsToSend: Array<{
    from: string;
    to: string[];
    subject: string;
    html: string;
  }> = [];
  const reminderLogs: Array<{
    founder_id: string;
    reminder_type: string;
    period_key: string;
  }> = [];

  const fromDomain = process.env.RESEND_FROM_DOMAIN ?? "velvet.app";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3001";

  for (const company of companies) {
    const founder = founderMap.get(company.founder_id!);
    if (!founder?.email) continue;

    const requests = companyRequests.get(company.id) ?? [];
    if (requests.length === 0) continue;

    // Check user preference for reminders
    const prefs = prefMap.get(company.founder_id!) as Record<string, unknown> | undefined;
    const reminderFreq = (prefs?.reminder_frequency as string) ?? "3d";
    if (reminderFreq === "off") continue;

    // Group requests by urgency
    for (const threshold of reminderThresholds) {
      // Skip if user doesn't want this frequency
      const enabledThresholds = {
        "7d": ["7d", "3d", "1d"],
        "3d": ["3d", "1d"],
        "1d": ["1d"],
        off: [],
      }[reminderFreq] ?? ["3d", "1d"];

      if (!enabledThresholds.includes(threshold.type)) continue;

      const urgentRequests = requests.filter((r) => {
        if (!r.due_date) return false;
        const due = new Date(r.due_date);
        const diffDays = Math.ceil(
          (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        // Match exact day thresholds (7 days out, 3 days out, 1 day out)
        return diffDays === threshold.days;
      });

      if (urgentRequests.length === 0) continue;

      // Build period key for dedup
      const periodKeys = [...new Set(urgentRequests.map((r) => r.period_start))];
      const periodKey = `${threshold.type}:${periodKeys.sort().join(",")}`;

      // Check if already sent
      const { data: existing } = await admin
        .from("founder_reminder_log")
        .select("id")
        .eq("founder_id", company.founder_id!)
        .eq("reminder_type", threshold.type)
        .eq("period_key", periodKey)
        .maybeSingle();

      if (existing) continue;

      // Build email
      const metricNames = urgentRequests
        .map((r) => defMap.get(r.metric_definition_id) ?? "Metric")
        .filter((v, i, a) => a.indexOf(v) === i);

      const dueDate = urgentRequests[0].due_date
        ? new Date(urgentRequests[0].due_date).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })
        : "soon";

      const founderName = founder.full_name ?? "there";
      const dayLabel =
        threshold.days === 1
          ? "tomorrow"
          : `in ${threshold.days} days`;

      emailsToSend.push({
        from: `Velvet <reminders@${fromDomain}>`,
        to: [founder.email],
        subject: `${urgentRequests.length} metric${urgentRequests.length !== 1 ? "s" : ""} due ${dayLabel} for ${escapeHtml(company.name)}`,
        html: `
          <p>Hi ${escapeHtml(founderName)},</p>
          <p>You have <strong>${urgentRequests.length} metric${urgentRequests.length !== 1 ? "s" : ""}</strong> due ${dayLabel} (${escapeHtml(dueDate)}) for <strong>${escapeHtml(company.name)}</strong>:</p>
          <ul>
            ${metricNames.map((n) => `<li>${escapeHtml(n)}</li>`).join("")}
          </ul>
          <p><a href="${appUrl}/portal/requests">Submit metrics now &rarr;</a></p>
          <p style="color: #888; font-size: 12px;">You can change reminder settings in your account preferences.</p>
        `.trim(),
      });

      reminderLogs.push({
        founder_id: company.founder_id!,
        reminder_type: threshold.type,
        period_key: periodKey,
      });
    }
  }

  // Send emails
  if (emailsToSend.length > 0) {
    const apiKey = process.env.RESEND_API_KEY;
    if (apiKey) {
      const result = await sendEmailBatchWithRetry(apiKey, emailsToSend);
      totalSent = result.sent;

      if (result.failed > 0) {
        logger.error(`Failed to send ${result.failed} founder reminder emails`);
      }
    } else {
      logger.error("RESEND_API_KEY not configured, skipping email send");
    }

    // Log sent reminders
    if (reminderLogs.length > 0) {
      const { error: logError } = await admin
        .from("founder_reminder_log")
        .insert(reminderLogs);

      if (logError) {
        logger.error("Failed to log reminders:", logError.message);
      }
    }
  }

  return NextResponse.json({
    sent: totalSent,
    pendingChecked: pendingRequests.length,
    companiesChecked: companies.length,
  });
}

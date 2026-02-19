import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";
import { checkRateLimit } from "@/lib/api/rate-limit";
import { sendEmailBatchWithRetry } from "@/lib/email/retry";
import { logger } from "@/lib/logger";
import { escapeHtml } from "@/lib/utils/html";
import {
  calculatePeriodDates,
  isValidQuarter,
  isValidYear,
  type PeriodInput,
} from "@/lib/utils/period";

const schema = z
  .object({
    companyId: z.string().uuid(),
    metricName: z.string().min(2),
    periodType: z.enum(["quarterly", "annual"]),
    year: z.number().int(),
    quarter: z.number().int().min(1).max(4).optional(),
    dueDate: z.string().optional(),
  })
  .refine(
    (data) => {
      // Quarter is required for quarterly period type
      if (data.periodType === "quarterly" && data.quarter === undefined) {
        return false;
      }
      return true;
    },
    { message: "Quarter is required for quarterly period type." }
  );

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("Invalid request body.", 400);

  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = (user.app_metadata?.role as string | undefined) ?? null;
  if (role !== "investor") return jsonError("Forbidden.", 403);

  // Rate limit: 10 metric requests per minute per user
  const rl = checkRateLimit(`metric-req:${user.id}`, 10, 60_000);
  if (!rl.allowed) {
    return jsonError("Too many requests. Please try again later.", 429);
  }

  const { companyId, metricName, periodType, year, quarter, dueDate } =
    parsed.data;

  // Validate year
  if (!isValidYear(year)) {
    return jsonError("Invalid year.", 400);
  }

  // Validate quarter if quarterly
  if (periodType === "quarterly" && !isValidQuarter(quarter!)) {
    return jsonError("Invalid quarter.", 400);
  }

  // Calculate period dates
  const periodInput: PeriodInput =
    periodType === "quarterly"
      ? { type: "quarterly", year, quarter: quarter as 1 | 2 | 3 | 4 }
      : { type: "annual", year };
  const { periodStart, periodEnd } = calculatePeriodDates(periodInput);

  // Verify investor has a relationship with this company
  const { data: relationship } = await supabase
    .from("investor_company_relationships")
    .select("id")
    .eq("investor_id", user.id)
    .eq("company_id", companyId)
    .single();

  if (!relationship) {
    return jsonError("Company not in your portfolio.", 403);
  }

  // Create (or reuse) a metric definition for this investor.
  const { data: metricDef, error: defError } = await supabase
    .from("metric_definitions")
    .insert({
      investor_id: user.id,
      name: metricName,
      period_type: periodType,
      data_type: "number",
    })
    .select("id")
    .single();

  if (defError) {
    logger.error("Failed to create metric definition:", defError.message);
    return jsonError("Failed to process request.", 400);
  }

  const { data: requestRow, error: reqError } = await supabase
    .from("metric_requests")
    .insert({
      investor_id: user.id,
      company_id: companyId,
      metric_definition_id: metricDef.id,
      period_start: periodStart,
      period_end: periodEnd,
      due_date: dueDate ?? null,
      status: "pending",
    })
    .select("id")
    .single();

  if (reqError) {
    logger.error("Failed to create metric request:", reqError.message);
    return jsonError("Failed to process request.", 400);
  }

  // Send email notification to founder (fire-and-forget)
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const notifyFounder = async () => {
      try {
        const { data: company } = await supabase
          .from("companies")
          .select("name, founder_email, founder_id")
          .eq("id", companyId)
          .single();

        if (!company?.founder_email) return;

        const investorName =
          user.user_metadata?.full_name || user.email || "An investor";
        const appUrl =
          process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";
        const fromDomain = process.env.RESEND_FROM_DOMAIN;
        const fromAddr = fromDomain
          ? `Velvet <notifications@${fromDomain}>`
          : "Velvet <onboarding@resend.dev>";

        const dueDateLine = dueDate
          ? `<p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 16px;">Due date: <strong style="color: #fff;">${escapeHtml(dueDate)}</strong></p>`
          : "";

        await sendEmailBatchWithRetry(apiKey, [
          {
            from: fromAddr,
            to: [company.founder_email],
            subject: `${escapeHtml(String(investorName))} requested your metrics`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #18181b; padding: 32px;">
                <div style="max-width: 480px; margin: 0 auto; background: #27272a; border-radius: 12px; padding: 24px; border: 1px solid rgba(255,255,255,0.1);">
                  <h2 style="color: #fff; margin: 0 0 8px;">New Metric Request</h2>
                  <p style="color: rgba(255,255,255,0.7); font-size: 14px; margin: 0 0 16px;">
                    ${escapeHtml(String(investorName))} has requested <strong style="color: #fff;">${escapeHtml(metricName)}</strong> for <strong style="color: #fff;">${escapeHtml(company.name)}</strong>.
                  </p>
                  ${dueDateLine}
                  <a href="${appUrl}/portal/requests" style="display: inline-block; background: #fff; color: #000; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 500;">
                    Submit Metrics
                  </a>
                </div>
              </div>
            `,
          },
        ]);
      } catch (err: unknown) {
        logger.error(
          "Failed to send metric request email:",
          err instanceof Error ? err.message : String(err),
        );
      }
    };
    notifyFounder();
  }

  return NextResponse.json({ id: requestRow.id });
}


import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - List all schedules for investor
export async function GET() {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const { data, error } = await supabase
    .from("metric_request_schedules")
    .select(`
      id,
      name,
      cadence,
      day_of_month,
      company_ids,
      include_future_companies,
      due_days_offset,
      reminder_enabled,
      reminder_days_before_due,
      is_active,
      next_run_at,
      last_run_at,
      created_at,
      updated_at,
      template_id,
      metric_templates (
        id,
        name,
        description,
        metric_template_items (
          id,
          metric_name,
          period_type,
          data_type,
          sort_order
        )
      )
    `)
    .eq("investor_id", user.id)
    .order("created_at", { ascending: false });

  if (error) return jsonError(error.message, 500);

  // Format response
  const schedules = (data ?? []).map((s) => {
    const template = Array.isArray(s.metric_templates)
      ? s.metric_templates[0]
      : s.metric_templates;

    return {
      id: s.id,
      name: s.name,
      cadence: s.cadence,
      dayOfMonth: s.day_of_month,
      companyIds: s.company_ids,
      includeFutureCompanies: s.include_future_companies,
      dueDaysOffset: s.due_days_offset,
      reminderEnabled: s.reminder_enabled,
      reminderDaysBeforeDue: s.reminder_days_before_due,
      isActive: s.is_active,
      nextRunAt: s.next_run_at,
      lastRunAt: s.last_run_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      template: template
        ? {
            id: template.id,
            name: template.name,
            description: template.description,
            items: (template.metric_template_items ?? []).sort(
              (a: { sort_order: number }, b: { sort_order: number }) =>
                a.sort_order - b.sort_order
            ),
          }
        : null,
    };
  });

  return NextResponse.json({ schedules });
}

// POST - Create a new schedule
const createSchema = z.object({
  name: z.string().min(1, "Name is required"),
  templateId: z.string().uuid("Invalid template ID"),
  cadence: z.enum(["monthly", "quarterly", "annual"]),
  dayOfMonth: z.number().int().min(1).max(28),
  companyIds: z.array(z.string().uuid()).nullable().optional(),
  includeFutureCompanies: z.boolean().default(false),
  dueDaysOffset: z.number().int().min(1).max(90).default(7),
  reminderEnabled: z.boolean().default(true),
  reminderDaysBeforeDue: z.array(z.number().int().min(1).max(30)).default([3, 1]),
});

export async function POST(req: Request) {
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return jsonError(firstError?.message ?? "Invalid request body.", 400);
  }

  const {
    name,
    templateId,
    cadence,
    dayOfMonth,
    companyIds,
    includeFutureCompanies,
    dueDaysOffset,
    reminderEnabled,
    reminderDaysBeforeDue,
  } = parsed.data;

  // Verify template exists and belongs to user or is a system template
  const { data: template, error: templateError } = await supabase
    .from("metric_templates")
    .select("id, investor_id, is_system")
    .eq("id", templateId)
    .single();

  if (templateError || !template) {
    return jsonError("Template not found.", 404);
  }

  // Allow system templates or user's own templates
  if (!template.is_system && template.investor_id !== user.id) {
    return jsonError("Template not accessible.", 403);
  }

  // If companyIds provided, verify all companies are in investor's portfolio
  if (companyIds && companyIds.length > 0) {
    const { data: relationships, error: relError } = await supabase
      .from("investor_company_relationships")
      .select("company_id")
      .eq("investor_id", user.id)
      .in("company_id", companyIds);

    if (relError) {
      return jsonError("Failed to verify companies.", 500);
    }

    const validIds = new Set((relationships ?? []).map((r) => r.company_id));
    const invalidIds = companyIds.filter((id) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return jsonError("Some companies are not in your portfolio.", 400);
    }
  }

  // Create the schedule
  const { data: schedule, error: createError } = await supabase
    .from("metric_request_schedules")
    .insert({
      investor_id: user.id,
      template_id: templateId,
      name,
      cadence,
      day_of_month: dayOfMonth,
      company_ids: companyIds || null,
      include_future_companies: includeFutureCompanies,
      due_days_offset: dueDaysOffset,
      reminder_enabled: reminderEnabled,
      reminder_days_before_due: reminderDaysBeforeDue,
    })
    .select("id, next_run_at")
    .single();

  if (createError) {
    return jsonError(createError.message, 400);
  }

  return NextResponse.json({
    id: schedule.id,
    nextRunAt: schedule.next_run_at,
    ok: true,
  });
}

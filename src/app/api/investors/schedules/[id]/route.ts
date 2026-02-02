import { NextResponse } from "next/server";
import { z } from "zod";

import { getApiUser, jsonError } from "@/lib/api/auth";

// GET - Get a single schedule with run history
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Get schedule with template and run history
  const { data: schedule, error } = await supabase
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
      ),
      scheduled_request_runs (
        id,
        run_at,
        period_start,
        period_end,
        requests_created,
        emails_sent,
        errors,
        status,
        company_ids,
        created_at
      )
    `)
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return jsonError("Schedule not found.", 404);
    }
    return jsonError(error.message, 500);
  }

  const template = Array.isArray(schedule.metric_templates)
    ? schedule.metric_templates[0]
    : schedule.metric_templates;

  const runs = (schedule.scheduled_request_runs ?? [])
    .sort(
      (a: { run_at: string }, b: { run_at: string }) =>
        new Date(b.run_at).getTime() - new Date(a.run_at).getTime()
    )
    .map((r: {
      id: string;
      run_at: string;
      period_start: string;
      period_end: string;
      requests_created: number;
      emails_sent: number;
      errors: unknown;
      status: string;
      company_ids: string[];
      created_at: string;
    }) => ({
      id: r.id,
      runAt: r.run_at,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      requestsCreated: r.requests_created,
      emailsSent: r.emails_sent,
      errors: r.errors,
      status: r.status,
      companyIds: r.company_ids,
      createdAt: r.created_at,
    }));

  // Get company names if specific companies are targeted
  let companies: { id: string; name: string }[] = [];
  if (schedule.company_ids && schedule.company_ids.length > 0) {
    const { data: companyData } = await supabase
      .from("companies")
      .select("id, name")
      .in("id", schedule.company_ids);
    companies = companyData ?? [];
  }

  return NextResponse.json({
    schedule: {
      id: schedule.id,
      name: schedule.name,
      cadence: schedule.cadence,
      dayOfMonth: schedule.day_of_month,
      companyIds: schedule.company_ids,
      companies,
      includeFutureCompanies: schedule.include_future_companies,
      dueDaysOffset: schedule.due_days_offset,
      reminderEnabled: schedule.reminder_enabled,
      reminderDaysBeforeDue: schedule.reminder_days_before_due,
      isActive: schedule.is_active,
      nextRunAt: schedule.next_run_at,
      lastRunAt: schedule.last_run_at,
      createdAt: schedule.created_at,
      updatedAt: schedule.updated_at,
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
      runs,
    },
  });
}

// PUT - Update a schedule
const updateSchema = z.object({
  name: z.string().min(1).optional(),
  cadence: z.enum(["monthly", "quarterly", "annual"]).optional(),
  dayOfMonth: z.number().int().min(1).max(28).optional(),
  companyIds: z.array(z.string().uuid()).nullable().optional(),
  includeFutureCompanies: z.boolean().optional(),
  dueDaysOffset: z.number().int().min(1).max(90).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderDaysBeforeDue: z.array(z.number().int().min(1).max(30)).optional(),
});

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const firstError = parsed.error.issues[0];
    return jsonError(firstError?.message ?? "Invalid request body.", 400);
  }

  // Verify schedule exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from("metric_request_schedules")
    .select("id, investor_id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !existing) {
    return jsonError("Schedule not found.", 404);
  }

  const {
    name,
    cadence,
    dayOfMonth,
    companyIds,
    includeFutureCompanies,
    dueDaysOffset,
    reminderEnabled,
    reminderDaysBeforeDue,
  } = parsed.data;

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
    const invalidIds = companyIds.filter((cid) => !validIds.has(cid));

    if (invalidIds.length > 0) {
      return jsonError("Some companies are not in your portfolio.", 400);
    }
  }

  // Build update object
  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (cadence !== undefined) updates.cadence = cadence;
  if (dayOfMonth !== undefined) updates.day_of_month = dayOfMonth;
  if (companyIds !== undefined) updates.company_ids = companyIds;
  if (includeFutureCompanies !== undefined) updates.include_future_companies = includeFutureCompanies;
  if (dueDaysOffset !== undefined) updates.due_days_offset = dueDaysOffset;
  if (reminderEnabled !== undefined) updates.reminder_enabled = reminderEnabled;
  if (reminderDaysBeforeDue !== undefined) updates.reminder_days_before_due = reminderDaysBeforeDue;

  if (Object.keys(updates).length === 0) {
    return jsonError("No updates provided.", 400);
  }

  const { error: updateError } = await supabase
    .from("metric_request_schedules")
    .update(updates)
    .eq("id", id);

  if (updateError) {
    return jsonError(updateError.message, 400);
  }

  return NextResponse.json({ ok: true });
}

// DELETE - Delete a schedule
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { supabase, user } = await getApiUser();
  if (!user) return jsonError("Unauthorized.", 401);

  const role = user.user_metadata?.role;
  if (role !== "investor") return jsonError("Investors only.", 403);

  // Verify schedule exists and belongs to user
  const { data: existing, error: fetchError } = await supabase
    .from("metric_request_schedules")
    .select("id")
    .eq("id", id)
    .eq("investor_id", user.id)
    .single();

  if (fetchError || !existing) {
    return jsonError("Schedule not found.", 404);
  }

  const { error: deleteError } = await supabase
    .from("metric_request_schedules")
    .delete()
    .eq("id", id);

  if (deleteError) {
    return jsonError(deleteError.message, 500);
  }

  return NextResponse.json({ ok: true });
}

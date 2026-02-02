import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus, Calendar } from "lucide-react";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScheduleList } from "@/components/investor/schedule-list";

export default async function SchedulesPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "investor") redirect("/portal");

  // Fetch schedules
  const { data: schedules, error } = await supabase
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

  // Handle case where table doesn't exist yet (migration not run)
  if (error) {
    const errorCode = (error as { code?: string })?.code;
    const errorMessage = (error as { message?: string })?.message;

    // PGRST200 = table doesn't exist, 42P01 = undefined table
    if (errorCode === "PGRST200" || errorCode === "42P01" || errorMessage?.includes("does not exist")) {
      console.warn("Schedules table not found - migration may not have been run yet");
      // Return empty state instead of crashing
      return (
        <div className="space-y-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <Link
                href="/requests"
                className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
              >
                <ArrowLeft className="h-4 w-4 text-white/50" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
                <p className="mt-1 text-sm text-white/60">
                  Automate recurring metric requests to your portfolio companies.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
            <p className="text-sm text-amber-200">
              The schedules feature requires a database migration. Please run{" "}
              <code className="rounded bg-black/30 px-1.5 py-0.5 text-xs">
                0010_metric_request_schedules.sql
              </code>{" "}
              in your Supabase SQL Editor.
            </p>
          </div>
        </div>
      );
    }

    console.error("Failed to fetch schedules:", error);
  }

  // Transform to expected format
  const formattedSchedules = (schedules ?? []).map((s) => {
    const template = Array.isArray(s.metric_templates)
      ? s.metric_templates[0]
      : s.metric_templates;

    return {
      id: s.id,
      name: s.name,
      cadence: s.cadence as "monthly" | "quarterly" | "annual",
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/requests"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 text-white/50" />
          </Link>
          <div>
            <h1 className="text-xl font-semibold tracking-tight">Schedules</h1>
            <p className="mt-1 text-sm text-white/60">
              Automate recurring metric requests to your portfolio companies.
            </p>
          </div>
        </div>
        <Link
          href="/requests/schedules/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
        >
          <Plus className="h-4 w-4" />
          New Schedule
        </Link>
      </div>

      {/* Info banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-blue-300" />
          <div>
            <p className="text-sm text-blue-200">
              Schedules automatically create metric requests and send email
              notifications to founders. Reminders are sent before the due date
              and automatically cancelled when metrics are submitted.
            </p>
          </div>
        </div>
      </div>

      {/* Schedule list */}
      <ScheduleList initialSchedules={formattedSchedules} />
    </div>
  );
}

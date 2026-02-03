import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ArrowLeft, Play, Pause, Edit, Trash2, Calendar, Clock, Building2, Bell } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ScheduleRunHistory, type ScheduleRun } from "@/components/investor/schedule-run-history";
import { getCadenceDescription } from "@/lib/schedules";
import { ScheduleDetailActions } from "./actions";

export default async function ScheduleDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.user_metadata?.role !== "investor") redirect("/portal");

  // Fetch schedule with template and runs
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

  if (error || !schedule) {
    notFound();
  }

  const template = Array.isArray(schedule.metric_templates)
    ? schedule.metric_templates[0]
    : schedule.metric_templates;

  const runs: ScheduleRun[] = (schedule.scheduled_request_runs ?? [])
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
      errors: { company?: string; metric?: string; message: string }[];
      status: "success" | "partial" | "failed";
      company_ids: string[];
      created_at: string;
    }) => ({
      id: r.id,
      runAt: r.run_at,
      periodStart: r.period_start,
      periodEnd: r.period_end,
      requestsCreated: r.requests_created,
      emailsSent: r.emails_sent,
      errors: r.errors ?? [],
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

  // Get total portfolio count
  const { count: portfolioCount } = await supabase
    .from("investor_company_relationships")
    .select("id", { count: "exact", head: true })
    .eq("investor_id", user.id);

  const metrics = template?.metric_template_items ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <Link
            href="/requests?tab=schedules"
            className="mt-1 flex h-8 w-8 items-center justify-center rounded-md border border-white/10 hover:bg-white/5"
          >
            <ArrowLeft className="h-4 w-4 text-white/50" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-semibold tracking-tight">
                {schedule.name}
              </h1>
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  schedule.is_active
                    ? "bg-emerald-500/20 text-emerald-200"
                    : "bg-zinc-500/20 text-zinc-300"
                }`}
              >
                {schedule.is_active ? "Active" : "Paused"}
              </span>
            </div>
            <p className="mt-1 text-sm text-white/60">
              Created {format(new Date(schedule.created_at), "MMM d, yyyy")}
            </p>
          </div>
        </div>

        <ScheduleDetailActions
          scheduleId={schedule.id}
          isActive={schedule.is_active}
          cadence={schedule.cadence as "monthly" | "quarterly" | "annual"}
          dayOfMonth={schedule.day_of_month}
        />
      </div>

      {/* Overview cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Cadence */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/50">
            <Calendar className="h-4 w-4" />
            <span className="text-xs">Cadence</span>
          </div>
          <div className="mt-2 font-medium">
            {getCadenceDescription(schedule.cadence as "monthly" | "quarterly" | "annual")}
          </div>
          <div className="text-xs text-white/40">Day {schedule.day_of_month}</div>
        </div>

        {/* Next run */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/50">
            <Clock className="h-4 w-4" />
            <span className="text-xs">Next Run</span>
          </div>
          <div className="mt-2 font-medium">
            {schedule.is_active && schedule.next_run_at
              ? formatDistanceToNow(new Date(schedule.next_run_at), {
                  addSuffix: true,
                })
              : schedule.is_active
                ? "Pending"
                : "Paused"}
          </div>
          {schedule.next_run_at && schedule.is_active && (
            <div className="text-xs text-white/40">
              {format(new Date(schedule.next_run_at), "MMM d, yyyy")}
            </div>
          )}
        </div>

        {/* Companies */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/50">
            <Building2 className="h-4 w-4" />
            <span className="text-xs">Companies</span>
          </div>
          <div className="mt-2 font-medium">
            {schedule.company_ids
              ? `${schedule.company_ids.length} selected`
              : `All (${portfolioCount ?? 0})`}
          </div>
          {schedule.include_future_companies && !schedule.company_ids && (
            <div className="text-xs text-white/40">Including future</div>
          )}
        </div>

        {/* Reminders */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex items-center gap-2 text-white/50">
            <Bell className="h-4 w-4" />
            <span className="text-xs">Reminders</span>
          </div>
          <div className="mt-2 font-medium">
            {schedule.reminder_enabled ? "Enabled" : "Disabled"}
          </div>
          {schedule.reminder_enabled && schedule.reminder_days_before_due && (
            <div className="text-xs text-white/40">
              {(schedule.reminder_days_before_due as number[])
                .map((d) => `${d}d`)
                .join(", ")}{" "}
              before due
            </div>
          )}
        </div>
      </div>

      {/* Template details */}
      {template && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-sm font-medium text-white/70">Template</h2>
          <div className="mt-2">
            <div className="font-medium">{template.name}</div>
            {template.description && (
              <p className="mt-1 text-sm text-white/50">{template.description}</p>
            )}
          </div>

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-white/50 mb-2">
                Metrics ({metrics.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(metrics as { id: string; metric_name: string; period_type: string }[])
                  .sort((a, b) => a.metric_name.localeCompare(b.metric_name))
                  .map((item) => (
                    <span
                      key={item.id}
                      className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70"
                    >
                      {item.metric_name}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Target companies */}
      {companies.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
          <h2 className="text-sm font-medium text-white/70">
            Target Companies ({companies.length})
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {companies.map((company) => (
              <Link
                key={company.id}
                href={`/dashboard/${company.id}`}
                className="rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-sm text-white/70 hover:bg-white/5 hover:text-white"
              >
                {company.name}
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Run history */}
      <div>
        <h2 className="mb-3 text-sm font-medium text-white/70">Run History</h2>
        <ScheduleRunHistory runs={runs} />
      </div>

      {/* Configuration summary */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
        <h2 className="text-sm font-medium text-white/70">Configuration</h2>
        <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div className="flex justify-between">
            <span className="text-white/50">Due date offset</span>
            <span>{schedule.due_days_offset} days after request</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Last run</span>
            <span>
              {schedule.last_run_at
                ? format(new Date(schedule.last_run_at), "MMM d, yyyy")
                : "Never"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Total runs</span>
            <span>{runs.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/50">Created</span>
            <span>{format(new Date(schedule.created_at), "MMM d, yyyy")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

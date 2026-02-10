"use client";

import * as React from "react";
import Link from "next/link";
import { Calendar, Plus } from "lucide-react";

import { ScheduleList } from "@/components/investor/schedule-list";
import type { Schedule } from "@/components/investor/schedule-card";

export function SchedulesTabContent() {
  const [schedules, setSchedules] = React.useState<Schedule[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [migrationNeeded, setMigrationNeeded] = React.useState(false);

  React.useEffect(() => {
    async function loadSchedules() {
      try {
        const res = await fetch("/api/investors/schedules");
        const json = await res.json().catch(() => null);

        if (!res.ok) {
          // Check for migration-not-run error
          if (json?.error?.includes("does not exist") || res.status === 500) {
            setMigrationNeeded(true);
            setSchedules([]);
            return;
          }
          throw new Error(json?.error ?? "Failed to load schedules.");
        }

        setSchedules(json.schedules ?? []);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        setSchedules([]);
      } finally {
        setLoading(false);
      }
    }
    loadSchedules();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default card-surface p-4"
          >
            <div className="space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-bg-hover" />
              <div className="h-4 w-64 animate-pulse rounded bg-bg-elevated" />
              <div className="flex gap-2">
                {[1, 2, 3].map((j) => (
                  <div key={j} className="h-5 w-16 animate-pulse rounded-full bg-bg-hover" />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (migrationNeeded) {
    return (
      <div className="rounded-xl border border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] p-4">
        <p className="text-sm text-[var(--status-warning-text)]">
          The schedules feature requires a database migration. Please run{" "}
          <code className="rounded bg-bg-input px-1.5 py-0.5 text-xs">
            0010_metric_request_schedules.sql
          </code>{" "}
          in your Supabase SQL Editor.
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with new schedule button */}
      <div className="flex items-center justify-between">
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-5 w-5 shrink-0 text-[var(--tag-blue-text)]" />
          <p className="text-sm text-text-tertiary">
            Schedules automatically create metric requests and send email
            notifications to founders on a recurring cadence.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="ml-4 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">New schedule</span>
        </Link>
      </div>

      {/* Schedule list */}
      <ScheduleList initialSchedules={schedules ?? []} />
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronRight,
  Calendar,
  Clock,
  Plus,
  Play,
  Pause,
  RefreshCw,
  Building2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { getCadenceDescription } from "@/lib/schedules";
import type { Schedule } from "@/components/investor/schedule-card";

const STORAGE_KEY = "velvet:schedules-collapsed";

export function CollapsibleSchedules() {
  const [schedules, setSchedules] = React.useState<Schedule[] | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [collapsed, setCollapsed] = React.useState<boolean | null>(null);
  const [togglingId, setTogglingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/investors/schedules");
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          setSchedules([]);
          return;
        }
        const loaded: Schedule[] = json.schedules ?? [];
        setSchedules(loaded);

        // Initialize collapsed state: read from localStorage, default expanded if schedules exist
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored !== null) {
          setCollapsed(stored === "true");
        } else {
          setCollapsed(loaded.length === 0);
        }
      } catch {
        setSchedules([]);
        setCollapsed(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleCollapsed() {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(STORAGE_KEY, String(next));
      return next;
    });
  }

  async function handleToggleActive(schedule: Schedule) {
    setTogglingId(schedule.id);
    try {
      const endpoint = schedule.isActive ? "pause" : "resume";
      const res = await fetch(
        `/api/investors/schedules/${schedule.id}/${endpoint}`,
        { method: "POST" }
      );
      const json = await res.json();
      if (!res.ok) return;

      setSchedules((prev) =>
        (prev ?? []).map((s) =>
          s.id === schedule.id
            ? {
                ...s,
                isActive: !schedule.isActive,
                nextRunAt: schedule.isActive
                  ? null
                  : json.nextRunAt ?? null,
              }
            : s
        )
      );
    } catch {
      // Silently fail, user can retry
    } finally {
      setTogglingId(null);
    }
  }

  const activeCount =
    schedules?.filter((s) => s.isActive).length ?? 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-border-default card-surface">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="h-5 w-52 animate-pulse rounded bg-bg-hover" />
        </div>
      </div>
    );
  }

  if (!schedules) return null;

  return (
    <div className="rounded-xl border border-border-default card-surface">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={toggleCollapsed}
        className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-bg-hover rounded-t-xl transition-colors"
      >
        <div className="flex items-center gap-2">
          {collapsed ? (
            <ChevronRight className="h-4 w-4 text-text-muted" />
          ) : (
            <ChevronDown className="h-4 w-4 text-text-muted" />
          )}
          <Calendar className="h-4 w-4 text-text-tertiary" />
          <span className="text-sm font-medium text-text-primary">
            Recurring Schedules
          </span>
          {schedules.length > 0 && (
            <span className="rounded-full bg-bg-hover px-2 py-0.5 text-xs text-text-secondary">
              {activeCount} active
            </span>
          )}
        </div>
        <Link
          href="/campaigns/new"
          onClick={(e) => e.stopPropagation()}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border-default bg-bg-elevated px-2.5 text-xs text-text-secondary hover:bg-bg-hover"
        >
          <Plus className="h-3 w-3" />
          Schedule
        </Link>
      </button>

      {/* Collapsible content */}
      {!collapsed && (
        <div className="border-t border-border-default px-4 py-3">
          {schedules.length === 0 ? (
            <p className="text-sm text-text-tertiary py-2">
              No recurring schedules yet. Create one from a new request to
              automate metric collection.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {schedules.map((schedule) => (
                <Link
                  key={schedule.id}
                  href={`/campaigns/schedules/${schedule.id}`}
                  className="group flex items-start justify-between gap-3 rounded-lg border border-border-default bg-bg-elevated p-3 transition-colors hover:bg-bg-hover"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary group-hover:underline truncate">
                        {schedule.name}
                      </span>
                      <span
                        className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] leading-tight ${
                          schedule.isActive
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                            : "bg-bg-hover text-text-secondary"
                        }`}
                      >
                        {schedule.isActive ? "Active" : "Paused"}
                      </span>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-text-tertiary">
                      <span>{getCadenceDescription(schedule.cadence)}</span>
                      <span className="text-text-faint">-</span>
                      {schedule.companyIds ? (
                        <span className="flex items-center gap-0.5">
                          <Building2 className="h-3 w-3" />
                          {schedule.companyIds.length}
                        </span>
                      ) : (
                        <span>All companies</span>
                      )}
                      {schedule.nextRunAt && schedule.isActive && (
                        <>
                          <span className="text-text-faint">-</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(
                              new Date(schedule.nextRunAt),
                              { addSuffix: true }
                            )}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleToggleActive(schedule);
                    }}
                    disabled={togglingId === schedule.id}
                    className="mt-0.5 shrink-0 inline-flex h-7 w-7 items-center justify-center rounded-md border border-border-default bg-bg-elevated text-text-muted hover:bg-bg-hover hover:text-text-secondary disabled:opacity-50"
                    title={schedule.isActive ? "Pause" : "Resume"}
                    aria-label={
                      schedule.isActive
                        ? `Pause ${schedule.name}`
                        : `Resume ${schedule.name}`
                    }
                  >
                    {togglingId === schedule.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : schedule.isActive ? (
                      <Pause className="h-3 w-3" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                  </button>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

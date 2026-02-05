"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  RefreshCw,
  Building2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";

import { getCadenceDescription } from "@/lib/schedules";

export type Schedule = {
  id: string;
  name: string;
  cadence: "monthly" | "quarterly" | "annual";
  dayOfMonth: number;
  companyIds: string[] | null;
  includeFutureCompanies: boolean;
  dueDaysOffset: number;
  reminderEnabled: boolean;
  reminderDaysBeforeDue: number[];
  isActive: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  createdAt: string;
  template: {
    id: string;
    name: string;
    description: string | null;
    items: {
      id: string;
      metric_name: string;
      period_type: string;
    }[];
  } | null;
};

interface ScheduleCardProps {
  schedule: Schedule;
  onPause: (id: string) => Promise<void>;
  onResume: (id: string) => Promise<void>;
  onRunNow: (id: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function ScheduleCard({
  schedule,
  onPause,
  onResume,
  onRunNow,
  onDelete,
}: ScheduleCardProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [menuOpen]);

  const handleAction = async (action: () => Promise<void>) => {
    setLoading(true);
    setMenuOpen(false);
    try {
      await action();
    } finally {
      setLoading(false);
    }
  };

  const metrics = schedule.template?.items ?? [];
  const maxVisibleMetrics = 4;
  const hasMoreMetrics = metrics.length > maxVisibleMetrics;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 sm:p-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <Link
            href={`/requests/schedules/${schedule.id}`}
            className="font-medium text-white hover:underline"
          >
            {schedule.name}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {getCadenceDescription(schedule.cadence)}
            </span>
            <span className="text-white/30">·</span>
            <span>Day {schedule.dayOfMonth}</span>
            {schedule.companyIds ? (
              <>
                <span className="text-white/30">·</span>
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {schedule.companyIds.length} companies
                </span>
              </>
            ) : (
              <>
                <span className="text-white/30">·</span>
                <span>All portfolio</span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status badge */}
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs ${
              schedule.isActive
                ? "bg-emerald-500/20 text-emerald-200"
                : "bg-zinc-500/20 text-zinc-300"
            }`}
          >
            {schedule.isActive ? "Active" : "Paused"}
          </span>

          {/* Menu */}
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw className="h-4 w-4 animate-spin text-white/50" />
              ) : (
                <MoreVertical className="h-4 w-4 text-white/50" />
              )}
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
                <button
                  type="button"
                  onClick={() => handleAction(() => onRunNow(schedule.id))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                >
                  <Play className="h-4 w-4" />
                  Run now
                </button>

                {schedule.isActive ? (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onPause(schedule.id))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <Pause className="h-4 w-4" />
                    Pause
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleAction(() => onResume(schedule.id))}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                  >
                    <Play className="h-4 w-4" />
                    Resume
                  </button>
                )}

                <div className="my-1 border-t border-white/10" />

                <button
                  type="button"
                  onClick={() => handleAction(() => onDelete(schedule.id))}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Template info */}
      {schedule.template && (
        <div className="mt-3 border-t border-white/5 pt-3">
          <div className="text-xs text-white/40">Template</div>
          <div className="mt-1 text-sm text-white/70">{schedule.template.name}</div>

          {/* Metrics */}
          {metrics.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {(expanded ? metrics : metrics.slice(0, maxVisibleMetrics)).map(
                (item) => (
                  <span
                    key={item.id}
                    className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60"
                  >
                    {item.metric_name}
                  </span>
                )
              )}
              {hasMoreMetrics && (
                <button
                  type="button"
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-0.5 rounded-full bg-white/5 px-2 py-0.5 text-xs text-white/50 hover:bg-white/10 hover:text-white/70"
                >
                  {expanded ? (
                    <>
                      Show less <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      +{metrics.length - maxVisibleMetrics} more{" "}
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Next run / Last run */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-white/60">
        {schedule.nextRunAt && schedule.isActive && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Next run:{" "}
            {formatDistanceToNow(new Date(schedule.nextRunAt), {
              addSuffix: true,
            })}
          </span>
        )}
        {schedule.lastRunAt && (
          <span>
            Last run: {format(new Date(schedule.lastRunAt), "MMM d, yyyy")}
          </span>
        )}
      </div>
    </div>
  );
}

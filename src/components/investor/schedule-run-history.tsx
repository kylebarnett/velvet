"use client";

import * as React from "react";
import { format } from "date-fns";
import { CheckCircle2, AlertCircle, XCircle, ChevronDown, ChevronUp } from "lucide-react";

export type ScheduleRun = {
  id: string;
  runAt: string;
  periodStart: string;
  periodEnd: string;
  requestsCreated: number;
  emailsSent: number;
  errors: { company?: string; metric?: string; message: string }[];
  status: "success" | "partial" | "failed";
  companyIds: string[];
  createdAt: string;
};

interface ScheduleRunHistoryProps {
  runs: ScheduleRun[];
}

const STATUS_CONFIG = {
  success: {
    icon: CheckCircle2,
    label: "Success",
    className: "text-emerald-400",
    bgClassName: "bg-emerald-500/10",
  },
  partial: {
    icon: AlertCircle,
    label: "Partial",
    className: "text-amber-400",
    bgClassName: "bg-amber-500/10",
  },
  failed: {
    icon: XCircle,
    label: "Failed",
    className: "text-red-400",
    bgClassName: "bg-red-500/10",
  },
};

function RunRow({ run }: { run: ScheduleRun }) {
  const [expanded, setExpanded] = React.useState(false);
  const status = STATUS_CONFIG[run.status];
  const StatusIcon = status.icon;
  const hasErrors = run.errors && run.errors.length > 0;

  return (
    <div className="border-b border-border-subtle last:border-0">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-4 py-3 text-left hover:bg-bg-elevated"
      >
        <div className={`flex items-center gap-2 ${status.className}`}>
          <StatusIcon className="h-4 w-4" />
          <span className="text-xs font-medium">{status.label}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="text-sm text-text-secondary">
            {format(new Date(run.runAt), "MMM d, yyyy 'at' h:mm a")}
          </div>
          <div className="text-xs text-text-muted">
            Period: {format(new Date(run.periodStart), "MMM d")} -{" "}
            {format(new Date(run.periodEnd), "MMM d, yyyy")}
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-4 text-xs text-text-tertiary">
          <span>
            {run.requestsCreated} request{run.requestsCreated !== 1 ? "s" : ""}
          </span>
          <span>
            {run.emailsSent} email{run.emailsSent !== 1 ? "s" : ""}
          </span>
          <span>
            {run.companyIds.length} compan{run.companyIds.length !== 1 ? "ies" : "y"}
          </span>
        </div>

        {hasErrors && (
          <span className="shrink-0 rounded-full bg-red-500/10 px-2 py-0.5 text-xs text-[var(--status-error-text)]">
            {run.errors.length} error{run.errors.length !== 1 ? "s" : ""}
          </span>
        )}

        {hasErrors ? (
          expanded ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-text-faint" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-text-faint" />
          )
        ) : (
          <div className="w-4" />
        )}
      </button>

      {/* Expanded details */}
      {expanded && hasErrors && (
        <div className="border-t border-border-subtle bg-bg-input px-4 py-3">
          {/* Mobile stats */}
          <div className="mb-3 flex flex-wrap gap-3 text-xs text-text-tertiary sm:hidden">
            <span>
              {run.requestsCreated} request{run.requestsCreated !== 1 ? "s" : ""}
            </span>
            <span>
              {run.emailsSent} email{run.emailsSent !== 1 ? "s" : ""}
            </span>
            <span>
              {run.companyIds.length} compan{run.companyIds.length !== 1 ? "ies" : "y"}
            </span>
          </div>

          <div className="text-xs font-medium text-text-tertiary mb-2">Errors</div>
          <div className="space-y-1.5">
            {run.errors.map((error, i) => (
              <div
                key={i}
                className="rounded bg-red-500/5 px-2 py-1.5 text-xs text-[var(--status-error-text)]"
              >
                {error.company && (
                  <span className="text-text-tertiary">{error.company}: </span>
                )}
                {error.metric && (
                  <span className="text-text-tertiary">{error.metric} - </span>
                )}
                {error.message}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function ScheduleRunHistory({ runs }: ScheduleRunHistoryProps) {
  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-border-default card-surface p-6 text-center">
        <div className="text-sm text-text-tertiary">
          No runs yet. This schedule will run automatically on its next scheduled
          date, or you can trigger it manually.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default overflow-hidden">
      <div className="border-b border-border-default bg-bg-elevated px-4 py-2">
        <h3 className="text-sm font-medium text-text-secondary">Run History</h3>
      </div>
      <div className="max-h-[400px] overflow-y-auto">
        {runs.map((run) => (
          <RunRow key={run.id} run={run} />
        ))}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronDown, BarChart3, AlertTriangle, Clock } from "lucide-react";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
};

type DataCompletenessInfo = {
  currentQuarter: string;
  submittedCount: number;
  totalRequested: number;
  overdueCount: number;
  daysTillDue: number | null;
  lastSubmissionDate: string | null;
  missingMetrics: { name: string; href: string }[];
};

type GettingStartedChecklistProps = {
  role: "investor" | "founder";
  items: ChecklistItem[];
  /** When provided and checklist is complete/dismissed, shows a data completeness card instead */
  dataCompleteness?: DataCompletenessInfo;
};

function DataCompletenessCard({ data, onDismiss }: { data: DataCompletenessInfo; onDismiss: () => void }) {
  const [collapsed, setCollapsed] = React.useState(false);

  const completionPercent = data.totalRequested > 0
    ? Math.round((data.submittedCount / data.totalRequested) * 100)
    : 100;

  const urgencyColor = completionPercent >= 80
    ? "text-[var(--success-accent)]"
    : completionPercent >= 50
      ? "text-[var(--warning-accent)]"
      : "text-[var(--error-accent)]";

  const barColor = completionPercent >= 80
    ? "bg-[var(--success-solid)]"
    : completionPercent >= 50
      ? "bg-[var(--warning-solid)]"
      : "bg-[var(--error-solid)]";

  const lastSubmitted = data.lastSubmissionDate
    ? (() => {
        const date = new Date(data.lastSubmissionDate);
        const daysDiff = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff === 0) return "today";
        if (daysDiff === 1) return "yesterday";
        if (daysDiff < 7) return `${daysDiff} days ago`;
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      })()
    : null;

  return (
    <div className="rounded-xl border border-border-subtle bg-gradient-to-br from-bg-raised to-transparent">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-text-muted" aria-hidden="true" />
          <h3 className="text-sm font-medium text-text-primary">Data Completeness</h3>
          <span className={`rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-bold tabular-nums ${urgencyColor}`}>
            {completionPercent}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label={collapsed ? "Expand" : "Collapse"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-4 mb-2">
        <div className="h-1.5 w-full rounded-full bg-bg-hover">
          <div
            className={`h-1.5 rounded-full ${barColor} transition-all duration-500`}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-3">
            <div className="rounded-lg bg-bg-elevated px-3 py-2 text-center">
              <span className="block text-lg font-bold tabular-nums text-text-primary">
                {data.submittedCount}/{data.totalRequested}
              </span>
              <span className="text-[10px] text-text-muted">
                {data.currentQuarter} metrics
              </span>
            </div>
            {data.overdueCount > 0 && (
              <div className="rounded-lg bg-[var(--error-bg-subtle)] px-3 py-2 text-center">
                <span className="flex items-center gap-1 text-lg font-bold tabular-nums text-[var(--error-accent)]">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                  {data.overdueCount}
                </span>
                <span className="text-[10px] text-[var(--error-accent)]">overdue</span>
              </div>
            )}
            {data.daysTillDue !== null && data.daysTillDue >= 0 && (
              <div className="rounded-lg bg-bg-elevated px-3 py-2 text-center">
                <span className="flex items-center gap-1 text-lg font-bold tabular-nums text-text-primary">
                  <Clock className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  {data.daysTillDue}
                </span>
                <span className="text-[10px] text-text-muted">days until due</span>
              </div>
            )}
          </div>

          {data.missingMetrics.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-text-tertiary">Missing metrics:</p>
              <div className="flex flex-wrap gap-1.5">
                {data.missingMetrics.slice(0, 8).map((m) => (
                  <Link
                    key={m.name}
                    href={m.href}
                    className="rounded-md bg-bg-elevated px-2 py-1 text-xs text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary"
                  >
                    {m.name}
                  </Link>
                ))}
                {data.missingMetrics.length > 8 && (
                  <span className="rounded-md bg-bg-elevated px-2 py-1 text-xs text-text-muted">
                    +{data.missingMetrics.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}

          {lastSubmitted && (
            <p className="text-xs text-text-faint">
              Last submission: {lastSubmitted}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function GettingStartedChecklist({ role, items, dataCompleteness }: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [completenessCardDismissed, setCompletenessCardDismissed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // Check localStorage on mount for dismissal
  React.useEffect(() => {
    const key = `velvet_checklist_dismissed_${role}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
    }
    const completenessKey = `velvet_completeness_dismissed_${role}`;
    if (localStorage.getItem(completenessKey) === "true") {
      setCompletenessCardDismissed(true);
    }
  }, [role]);

  function handleDismiss() {
    const key = `velvet_checklist_dismissed_${role}`;
    localStorage.setItem(key, "true");
    setDismissed(true);
    // Also persist to user preferences for cross-device
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `checklist_dismissed_${role}`, value: true }),
    }).catch(() => {});
  }

  function handleCompletenessCardDismiss() {
    const key = `velvet_completeness_dismissed_${role}`;
    localStorage.setItem(key, "true");
    setCompletenessCardDismissed(true);
  }

  const completedCount = items.filter((i) => i.completed).length;
  const allComplete = completedCount === items.length;

  // Show data completeness card when checklist is complete/dismissed and data is available
  if ((dismissed || allComplete) && dataCompleteness && !completenessCardDismissed) {
    return (
      <DataCompletenessCard
        data={dataCompleteness}
        onDismiss={handleCompletenessCardDismiss}
      />
    );
  }

  // Original behavior: hide when dismissed or all complete (without completeness data)
  if (dismissed || allComplete) return null;

  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border-subtle bg-gradient-to-br from-bg-raised to-transparent">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">Getting Started</h3>
          <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mx-4 mb-2">
        <div className="h-1 w-full rounded-full bg-bg-hover">
          <div
            className="h-1 rounded-full bg-[var(--success-solid)] transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                item.completed
                  ? "opacity-60"
                  : "hover:bg-bg-elevated"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--success-accent)]" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
              )}
              <div className="min-w-0">
                <span className={`text-sm ${item.completed ? "line-through text-text-muted" : "font-medium text-text-primary"}`}>
                  {item.label}
                </span>
                <p className="mt-0.5 text-xs text-text-muted">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

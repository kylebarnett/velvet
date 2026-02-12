"use client";

import * as React from "react";
import Link from "next/link";
import { Inbox, CheckCircle2, Info } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { formatPeriod } from "@/components/charts/types";
import { getMetricDefinition, inferMetricValueType } from "@/lib/metric-definitions";

type GroupedRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: string;
  investorCount: number;
  investorNames: string[];
  requestIds: string[];
  hasSubmission: boolean;
  submittedValue?: unknown;
};

type PeriodGroup = {
  label: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  metrics: GroupedRequest[];
  investorNames: string[];
};

type NotificationListProps = {
  mode?: "pending" | "completed";
  onCompanyId: (id: string) => void;
  onSubmitGroup?: (group: {
    periodType: string;
    periodStart: string;
    periodEnd: string;
  }) => void;
  onCounts?: (counts: { pending: number; completed: number }) => void;
};

function formatPeriodLabel(periodType: string, periodStart: string): string {
  // Use UTC methods — date-only strings parse as midnight UTC.
  const date = new Date(periodStart);
  if (periodType === "quarterly") {
    const q = Math.floor(date.getUTCMonth() / 3) + 1;
    return `Q${q} ${date.getUTCFullYear()} Metrics`;
  }
  if (periodType === "monthly") {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    return `${monthNames[date.getUTCMonth()]} ${date.getUTCFullYear()} Metrics`;
  }
  return `${date.getUTCFullYear()} Metrics`;
}

function getDueUrgency(dueDate: string | null): {
  color: string;
  label: string;
} | null {
  if (!dueDate) return null;
  const now = new Date();
  const due = new Date(dueDate);
  const diffDays = Math.ceil(
    (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) {
    return { color: "text-[var(--status-error-text)] bg-[var(--status-error-bg)]", label: "Overdue" };
  }
  if (diffDays <= 3) {
    return {
      color: "text-[var(--status-warning-text)] bg-[var(--status-warning-bg)]",
      label: `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
    };
  }
  return {
    color: "text-text-tertiary bg-bg-elevated",
    label: `Due ${due.toLocaleDateString()}`,
  };
}

function formatSubmittedValue(metricName: string, value: unknown): string | null {
  if (value == null) return null;
  let raw: string | number;
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    raw = (obj.raw ?? obj.value ?? "") as string | number;
  } else {
    raw = value as string | number;
  }

  const num = typeof raw === "number" ? raw : parseFloat(String(raw));
  if (isNaN(num)) return String(raw);

  const valueType = inferMetricValueType(metricName);
  if (valueType === "currency") {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
    return `$${num.toFixed(0)}`;
  }
  if (valueType === "percent") return `${num.toFixed(1)}%`;
  if (valueType === "ratio") return num.toFixed(2);
  if (valueType === "time") return `${num.toFixed(1)} mo`;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(0)}K`;
  return num.toLocaleString();
}

function MetricInfoBadge({ metricName }: { metricName: string }) {
  const [show, setShow] = React.useState(false);
  const info = getMetricDefinition(metricName);
  if (!info) return null;

  return (
    <span className="relative inline-block align-middle">
      <button
        type="button"
        className="text-text-faint hover:text-text-tertiary transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        aria-label={`Info about ${metricName}`}
      >
        <Info className="h-3 w-3" />
      </button>
      {show && (
        <span className="absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 w-56 rounded-lg border border-border-default bg-bg-secondary p-2.5 shadow-xl">
          <span className="block text-xs text-text-tertiary">{info.description}</span>
          {info.formula && (
            <span className="mt-1.5 block rounded bg-bg-elevated px-2 py-1 text-[10px] text-[var(--success-accent)] font-mono">
              {info.formula}
            </span>
          )}
        </span>
      )}
    </span>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-default card-surface p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-bg-hover" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 rounded-md bg-bg-elevated" />
                <div className="h-5 w-20 rounded-md bg-bg-elevated" />
                <div className="h-5 w-14 rounded-md bg-bg-elevated" />
              </div>
              <div className="h-3 w-32 rounded bg-bg-elevated" />
            </div>
            <div className="h-8 w-16 rounded-md bg-bg-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationList({
  mode = "pending",
  onCompanyId,
  onSubmitGroup,
  onCounts,
}: NotificationListProps) {
  const [requests, setRequests] = React.useState<GroupedRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const onCompanyIdRef = React.useRef(onCompanyId);
  onCompanyIdRef.current = onCompanyId;
  const onCountsRef = React.useRef(onCounts);
  onCountsRef.current = onCounts;

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/metric-requests");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        if (json.companyId) onCompanyIdRef.current(json.companyId);
        const reqs: GroupedRequest[] = json.requests ?? [];
        setRequests(reqs);
        if (onCountsRef.current) {
          const pending = reqs.filter((r) => !r.hasSubmission).length;
          const completed = reqs.filter((r) => r.hasSubmission).length;
          onCountsRef.current({ pending, completed });
        }
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const pendingRequests = requests.filter((r) => !r.hasSubmission);
  const submittedRequests = requests.filter((r) => r.hasSubmission);

  // Group pending requests by period
  const periodGroups = React.useMemo(() => {
    const groups = new Map<string, PeriodGroup>();
    for (const req of pendingRequests) {
      const key = `${req.periodType}-${req.periodStart}-${req.periodEnd}`;
      if (!groups.has(key)) {
        groups.set(key, {
          label: formatPeriodLabel(req.periodType, req.periodStart),
          periodType: req.periodType,
          periodStart: req.periodStart,
          periodEnd: req.periodEnd,
          dueDate: req.dueDate,
          metrics: [],
          investorNames: [],
        });
      }
      const group = groups.get(key)!;
      group.metrics.push(req);
      // Collect unique investor names across all metrics in this period
      for (const name of req.investorNames ?? []) {
        if (!group.investorNames.includes(name)) {
          group.investorNames.push(name);
        }
      }
      // Use earliest due date
      if (
        req.dueDate &&
        (!group.dueDate ||
          new Date(req.dueDate) < new Date(group.dueDate))
      ) {
        group.dueDate = req.dueDate;
      }
    }
    // Sort by due date (earliest first), then by period start
    return Array.from(groups.values()).sort((a, b) => {
      if (a.dueDate && b.dueDate)
        return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      return (
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime()
      );
    });
  }, [pendingRequests]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
        {error}
      </div>
    );
  }

  const displayRequests = mode === "completed" ? submittedRequests : pendingRequests;

  if (displayRequests.length === 0) {
    return (
      <div className="space-y-3">
        <EmptyState
          icon={mode === "completed" ? CheckCircle2 : Inbox}
          title={
            mode === "completed"
              ? "No completed submissions yet"
              : "No pending metric requests"
          }
          description={
            mode === "completed"
              ? "Completed submissions will appear here after you submit metrics. You can also submit metrics proactively from your dashboard."
              : "You're all caught up! When investors request metrics from your company, they'll appear here grouped by period. You can also submit metrics proactively from your dashboard."
          }
        />
        {mode === "pending" && (
          <div className="text-center">
            <Link
              href="/portal/historical-upload"
              className="text-sm text-text-tertiary hover:text-text-secondary underline underline-offset-2"
            >
              Import historical metrics
            </Link>
          </div>
        )}
      </div>
    );
  }

  if (mode === "completed") {
    // Group completed requests by period (same grouping logic as pending)
    const completedGroups = new Map<string, PeriodGroup>();
    for (const req of submittedRequests) {
      const key = `${req.periodType}-${req.periodStart}-${req.periodEnd}`;
      if (!completedGroups.has(key)) {
        completedGroups.set(key, {
          label: formatPeriodLabel(req.periodType, req.periodStart),
          periodType: req.periodType,
          periodStart: req.periodStart,
          periodEnd: req.periodEnd,
          dueDate: req.dueDate,
          metrics: [],
          investorNames: [],
        });
      }
      const group = completedGroups.get(key)!;
      group.metrics.push(req);
      for (const name of req.investorNames ?? []) {
        if (!group.investorNames.includes(name)) {
          group.investorNames.push(name);
        }
      }
    }

    const sortedCompleted = Array.from(completedGroups.values()).sort(
      (a, b) =>
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
    );

    return (
      <div className="space-y-3">
        {sortedCompleted.map((group) => (
          <div
            key={`${group.periodType}-${group.periodStart}`}
            className="rounded-xl border border-border-default card-surface p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-text-secondary">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-[var(--success-bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--status-success-text)]">
                    Submitted
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.metrics.map((m) => {
                    const formatted = formatSubmittedValue(m.metricName, m.submittedValue);
                    return (
                      <span
                        key={m.metricName}
                        className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-tertiary"
                      >
                        {m.metricName}
                        {formatted && (
                          <span className="font-mono text-text-secondary">{formatted}</span>
                        )}
                        <MetricInfoBadge metricName={m.metricName} />
                      </span>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs text-text-muted">
                  {group.metrics.length} metric
                  {group.metrics.length !== 1 ? "s" : ""} &middot;{" "}
                  Requested by{" "}
                  {group.investorNames.length > 0
                    ? group.investorNames.join(", ")
                    : "investor"}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {periodGroups.map((group) => {
        const urgency = getDueUrgency(group.dueDate);
        const totalInvestors = Math.max(
          ...group.metrics.map((m) => m.investorCount),
        );

        return (
          <div
            key={`${group.periodType}-${group.periodStart}`}
            className="rounded-xl border border-border-default card-surface p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {group.label}
                  </span>
                  {urgency && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${urgency.color}`}
                    >
                      {urgency.label}
                    </span>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.metrics.map((m) => (
                    <span
                      key={m.metricName}
                      className="inline-flex items-center gap-1 rounded-md bg-bg-elevated px-2 py-0.5 text-xs text-text-secondary"
                    >
                      {m.metricName}
                      <MetricInfoBadge metricName={m.metricName} />
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-text-tertiary">
                  {group.metrics.length} metric
                  {group.metrics.length !== 1 ? "s" : ""} &middot;{" "}
                  Requested by{" "}
                  {group.investorNames.length > 0
                    ? group.investorNames.join(", ")
                    : `${totalInvestors} investor${totalInvestors !== 1 ? "s" : ""}`}
                </div>
              </div>
              {onSubmitGroup && (
                <button
                  type="button"
                  onClick={() =>
                    onSubmitGroup({
                      periodType: group.periodType,
                      periodStart: group.periodStart,
                      periodEnd: group.periodEnd,
                    })
                  }
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-btn-primary-bg px-3 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover"
                >
                  Submit
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

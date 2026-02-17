"use client";

import * as React from "react";
import Link from "next/link";
import { Info, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  submittedNotes?: string | null;
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

function CompletedSubmissions({ requests }: { requests: GroupedRequest[] }) {
  const [expanded, setExpanded] = React.useState<Set<string>>(new Set());

  function toggle(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const groups = React.useMemo(() => {
    const map = new Map<string, PeriodGroup>();
    for (const req of requests) {
      const key = `${req.periodType}-${req.periodStart}-${req.periodEnd}`;
      if (!map.has(key)) {
        map.set(key, {
          label: formatPeriodLabel(req.periodType, req.periodStart),
          periodType: req.periodType,
          periodStart: req.periodStart,
          periodEnd: req.periodEnd,
          dueDate: req.dueDate,
          metrics: [],
          investorNames: [],
        });
      }
      const group = map.get(key)!;
      group.metrics.push(req);
      for (const name of req.investorNames ?? []) {
        if (!group.investorNames.includes(name)) {
          group.investorNames.push(name);
        }
      }
    }
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.periodStart).getTime() - new Date(a.periodStart).getTime(),
    );
  }, [requests]);

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        const key = `${group.periodType}-${group.periodStart}`;
        const isExpanded = expanded.has(key);

        return (
          <div
            key={key}
            className="rounded-xl border border-border-default card-surface"
          >
            <button
              type="button"
              onClick={() => toggle(key)}
              className="flex w-full items-start justify-between gap-4 p-4 text-left transition-colors hover:bg-bg-elevated/50"
              aria-expanded={isExpanded}
            >
              <div className="min-w-0 flex-1">
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
              <ChevronRight
                className={`mt-0.5 h-4 w-4 shrink-0 text-text-tertiary transition-transform duration-200 ${
                  isExpanded ? "rotate-90" : ""
                }`}
              />
            </button>

            {isExpanded && (
              <div className="border-t border-border-default px-4 pb-4 pt-3">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="text-xs text-text-muted">
                      <th className="pb-2 font-medium">Metric</th>
                      <th className="pb-2 font-medium">Value</th>
                      <th className="pb-2 font-medium">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-default">
                    {group.metrics.map((m) => {
                      const formatted = formatSubmittedValue(m.metricName, m.submittedValue);
                      return (
                        <tr key={m.metricName}>
                          <td className="py-2 pr-4">
                            <span className="inline-flex items-center gap-1 text-text-secondary">
                              {m.metricName}
                              <MetricInfoBadge metricName={m.metricName} />
                            </span>
                          </td>
                          <td className="py-2 pr-4 font-mono text-text-primary">
                            {formatted ?? "—"}
                          </td>
                          <td className="py-2 text-text-tertiary">
                            {m.submittedNotes || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
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
          // Count unique period groups (not individual metrics) — each period
          // group is one "request" the founder needs to action.
          const pendingKeys = new Set<string>();
          const completedKeys = new Set<string>();
          for (const r of reqs) {
            const key = `${r.periodType}-${r.periodStart}-${r.periodEnd}`;
            if (r.hasSubmission) {
              completedKeys.add(key);
            } else {
              pendingKeys.add(key);
            }
          }
          onCountsRef.current({ pending: pendingKeys.size, completed: completedKeys.size });
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
          variant="inline"
          title={
            mode === "completed"
              ? "No completed submissions yet"
              : "No pending metric requests"
          }
          description={
            mode === "completed"
              ? "Completed submissions will appear here after you submit metrics. You can also submit metrics proactively from your dashboard."
              : "No pending metric requests right now. When investors request metrics from your company, they'll appear here grouped by period. You can also submit metrics proactively from your dashboard."
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
    return <CompletedSubmissions requests={submittedRequests} />;
  }

  return (
    <div className="space-y-3">
      {periodGroups.map((group) => {
        const urgency = getDueUrgency(group.dueDate);
        const totalInvestors = Math.max(
          ...group.metrics.map((m) => m.investorCount),
        );

        const isOverdue = urgency?.label === "Overdue";
        return (
          <div
            key={`${group.periodType}-${group.periodStart}`}
            className={`rounded-xl border p-4 ${
              isOverdue
                ? "border-[var(--error-border)] bg-[var(--status-error-bg)]"
                : "border-border-default card-surface"
            }`}
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
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    onSubmitGroup({
                      periodType: group.periodType,
                      periodStart: group.periodStart,
                      periodEnd: group.periodEnd,
                    })
                  }
                >
                  Submit
                </Button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

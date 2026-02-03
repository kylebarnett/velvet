"use client";

import * as React from "react";
import { formatPeriod } from "@/components/charts/types";

type GroupedRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: string;
  investorCount: number;
  requestIds: string[];
  hasSubmission: boolean;
};

type PeriodGroup = {
  label: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  metrics: GroupedRequest[];
};

type NotificationListProps = {
  onCompanyId: (id: string) => void;
  onSubmitGroup: (group: {
    periodType: string;
    periodStart: string;
    periodEnd: string;
  }) => void;
};

function formatPeriodLabel(periodType: string, periodStart: string): string {
  const date = new Date(periodStart);
  if (periodType === "quarterly") {
    const q = Math.floor(date.getMonth() / 3) + 1;
    return `Q${q} ${date.getFullYear()} Metrics`;
  }
  if (periodType === "monthly") {
    return `${date.toLocaleDateString("en-US", { month: "long", year: "numeric" })} Metrics`;
  }
  return `${date.getFullYear()} Metrics`;
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
    return { color: "text-red-300 bg-red-500/20", label: "Overdue" };
  }
  if (diffDays <= 3) {
    return {
      color: "text-amber-200 bg-amber-500/20",
      label: `Due in ${diffDays} day${diffDays !== 1 ? "s" : ""}`,
    };
  }
  return {
    color: "text-white/60 bg-white/5",
    label: `Due ${due.toLocaleDateString()}`,
  };
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded bg-white/10" />
              <div className="flex gap-1.5">
                <div className="h-5 w-16 rounded-md bg-white/5" />
                <div className="h-5 w-20 rounded-md bg-white/5" />
                <div className="h-5 w-14 rounded-md bg-white/5" />
              </div>
              <div className="h-3 w-32 rounded bg-white/5" />
            </div>
            <div className="h-8 w-16 rounded-md bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function NotificationList({
  onCompanyId,
  onSubmitGroup,
}: NotificationListProps) {
  const [requests, setRequests] = React.useState<GroupedRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const onCompanyIdRef = React.useRef(onCompanyId);
  onCompanyIdRef.current = onCompanyId;

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/metric-requests");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        if (json.companyId) onCompanyIdRef.current(json.companyId);
        setRequests(json.requests ?? []);
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
        });
      }
      groups.get(key)!.metrics.push(req);
      // Use earliest due date
      if (
        req.dueDate &&
        (!groups.get(key)!.dueDate ||
          new Date(req.dueDate) < new Date(groups.get(key)!.dueDate!))
      ) {
        groups.get(key)!.dueDate = req.dueDate;
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
      <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {error}
      </div>
    );
  }

  if (pendingRequests.length === 0 && submittedRequests.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">No metric requests yet.</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {periodGroups.length > 0 && (
        <div className="space-y-3">
          {periodGroups.map((group) => {
            const urgency = getDueUrgency(group.dueDate);
            const totalInvestors = Math.max(
              ...group.metrics.map((m) => m.investorCount),
            );

            return (
              <div
                key={`${group.periodType}-${group.periodStart}`}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
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
                          className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/70"
                        >
                          {m.metricName}
                        </span>
                      ))}
                    </div>
                    <div className="mt-2 text-xs text-white/50">
                      {group.metrics.length} metric
                      {group.metrics.length !== 1 ? "s" : ""} &middot;{" "}
                      {totalInvestors} investor
                      {totalInvestors !== 1 ? "s" : ""} requesting
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onSubmitGroup({
                        periodType: group.periodType,
                        periodStart: group.periodStart,
                        periodEnd: group.periodEnd,
                      })
                    }
                    className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
                  >
                    Submit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {submittedRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white/50">Completed</h2>
          {submittedRequests.map((req) => (
            <div
              key={`${req.metricName}-${req.periodStart}-${req.periodEnd}`}
              className="rounded-xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white/60">
                    {req.metricName}
                  </span>
                  <span className="ml-2 text-xs text-white/40">
                    {formatPeriod(req.periodStart, req.periodType)}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                  Submitted
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

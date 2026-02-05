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
  investorNames: string[];
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
  mode = "pending",
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
      <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
        {error}
      </div>
    );
  }

  const displayRequests = mode === "completed" ? submittedRequests : pendingRequests;

  if (displayRequests.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="text-sm text-white/60">
          {mode === "completed"
            ? "No completed submissions yet."
            : "No pending metric requests."}
        </div>
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
            className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-white/70">
                    {group.label}
                  </span>
                  <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                    Submitted
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {group.metrics.map((m) => (
                    <span
                      key={m.metricName}
                      className="rounded-md bg-white/5 px-2 py-0.5 text-xs text-white/60"
                    >
                      {m.metricName}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-xs text-white/40">
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
                <div className="mt-2 text-xs text-white/60">
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
                  className="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
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

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { NotificationList } from "@/components/founder/notification-list";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

const BatchSubmissionTable = React.lazy(() =>
  import("@/components/founder/batch-submission-table").then((mod) => ({
    default: mod.BatchSubmissionTable,
  }))
);

type TabValue = "pending" | "completed";

type RequestCounts = {
  pending: number;
  completed: number;
};

function buildTabs(counts: RequestCounts | null): TabItem<TabValue>[] {
  return [
    {
      value: "pending" as const,
      label: counts && counts.pending > 0 ? `Pending (${counts.pending})` : "Pending",
    },
    {
      value: "completed" as const,
      label: counts && counts.completed > 0 ? `Completed (${counts.completed})` : "Completed",
    },
  ];
}

export default function FounderRequestsPage() {
  const router = useRouter();
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabValue>("pending");
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [counts, setCounts] = React.useState<RequestCounts | null>(null);
  const tabs = React.useMemo(() => buildTabs(counts), [counts]);
  const [submitPeriod, setSubmitPeriod] = React.useState<{
    periodType: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  function handleSubmitGroup(group: {
    periodType: string;
    periodStart: string;
    periodEnd: string;
  }) {
    setSubmitPeriod(group);
  }

  function handleBackFromSubmit() {
    setSubmitPeriod(null);
    setRefreshKey((k) => k + 1);
    router.refresh();
  }

  // When a pending group's "Submit" is clicked, show the batch table inline
  if (submitPeriod) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Metric Requests</h1>
          <p className="text-sm text-text-tertiary">
            Submit metrics for the selected period.
          </p>
        </div>

        <React.Suspense
          fallback={
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border-default card-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="h-5 w-48 animate-pulse rounded bg-bg-hover" />
                    <div className="h-6 w-16 animate-pulse rounded-full bg-bg-elevated" />
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="h-3 w-64 animate-pulse rounded bg-bg-elevated" />
                    <div className="h-3 w-40 animate-pulse rounded bg-bg-elevated" />
                  </div>
                </div>
              ))}
            </div>
          }
        >
          <BatchSubmissionTable
            initialCompanyId={companyId}
            prefilterPeriod={submitPeriod}
            onBack={handleBackFromSubmit}
          />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1" data-onboarding="requests-title">
        <h1 className="text-xl font-semibold tracking-tight">Metric Requests</h1>
        <p className="text-sm text-text-tertiary">
          Metrics your investors have requested. Submit values here or from your dashboard.
        </p>
      </div>

      {/* Tab toggle */}
      <SlidingTabs
        tabs={tabs}
        value={tab}
        onChange={setTab}
        size="sm"
        showIcons={false}
      />

      {tab === "pending" && (
        <NotificationList
          key={refreshKey}
          mode="pending"
          onCompanyId={setCompanyId}
          onSubmitGroup={handleSubmitGroup}
          onCounts={setCounts}
        />
      )}

      {tab === "completed" && (
        <NotificationList
          key={`completed-${refreshKey}`}
          mode="completed"
          onCompanyId={setCompanyId}
          onCounts={setCounts}
        />
      )}
    </div>
  );
}

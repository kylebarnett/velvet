"use client";

import * as React from "react";
import { NotificationList } from "@/components/founder/notification-list";
import { BatchSubmissionTable } from "@/components/founder/batch-submission-table";

export default function FounderRequestsPage() {
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"pending" | "completed">("pending");
  const [refreshKey, setRefreshKey] = React.useState(0);
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
  }

  const tabs = [
    { value: "pending" as const, label: "Pending" },
    { value: "completed" as const, label: "Completed" },
  ];

  // When a pending group's "Submit" is clicked, show the batch table inline
  if (submitPeriod) {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-white/60">
            Submit metrics for the selected period.
          </p>
        </div>

        <BatchSubmissionTable
          initialCompanyId={companyId}
          prefilterPeriod={submitPeriod}
          onBack={handleBackFromSubmit}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
        <p className="text-sm text-white/60">
          View pending metric requests from your investors.
        </p>
      </div>

      {/* Tab toggle */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5 w-fit">
        {tabs.map((t) => (
          <button
            key={t.value}
            type="button"
            onClick={() => setTab(t.value)}
            className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
              tab === t.value
                ? "bg-white/10 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "pending" && (
        <NotificationList
          key={refreshKey}
          mode="pending"
          onCompanyId={setCompanyId}
          onSubmitGroup={handleSubmitGroup}
        />
      )}

      {tab === "completed" && (
        <NotificationList
          key={`completed-${refreshKey}`}
          mode="completed"
          onCompanyId={setCompanyId}
        />
      )}
    </div>
  );
}

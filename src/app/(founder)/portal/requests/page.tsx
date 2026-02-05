"use client";

import * as React from "react";
import { NotificationList } from "@/components/founder/notification-list";
import { BatchSubmissionTable } from "@/components/founder/batch-submission-table";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type TabValue = "pending" | "completed";

const tabs: TabItem<TabValue>[] = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
];

export default function FounderRequestsPage() {
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<TabValue>("pending");
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

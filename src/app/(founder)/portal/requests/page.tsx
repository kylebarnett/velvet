"use client";

import * as React from "react";
import { NotificationList } from "@/components/founder/notification-list";
import { BatchSubmissionTable } from "@/components/founder/batch-submission-table";

export default function FounderRequestsPage() {
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"pending" | "submit">("pending");
  const [prefilterPeriod, setPrefilterPeriod] = React.useState<{
    periodType: string;
    periodStart: string;
    periodEnd: string;
  } | null>(null);

  function handleSubmitGroup(group: {
    periodType: string;
    periodStart: string;
    periodEnd: string;
  }) {
    setPrefilterPeriod(group);
    setView("submit");
  }

  function handleBackToPending() {
    setView("pending");
    setPrefilterPeriod(null);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
        <p className="text-sm text-white/60">
          View pending metric requests and submit metrics in bulk.
        </p>
      </div>

      {/* View toggle */}
      <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5 w-fit">
        <button
          type="button"
          onClick={() => {
            setView("pending");
            setPrefilterPeriod(null);
          }}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            view === "pending"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Pending Requests
        </button>
        <button
          type="button"
          onClick={() => setView("submit")}
          className={`rounded-md px-4 py-1.5 text-xs font-medium transition-colors ${
            view === "submit"
              ? "bg-white/10 text-white"
              : "text-white/50 hover:text-white/70"
          }`}
        >
          Submit Metrics
        </button>
      </div>

      {view === "pending" && (
        <NotificationList
          onCompanyId={setCompanyId}
          onSubmitGroup={handleSubmitGroup}
        />
      )}

      {view === "submit" && (
        <BatchSubmissionTable
          initialCompanyId={companyId}
          prefilterPeriod={prefilterPeriod}
          onBack={handleBackToPending}
        />
      )}
    </div>
  );
}

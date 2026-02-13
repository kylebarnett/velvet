"use client";

import Link from "next/link";
import { Plus, FileText } from "lucide-react";

import { CampaignsTabContent } from "@/components/investor/requests-tab-content";
import { CollapsibleSchedules } from "@/components/investor/collapsible-schedules";

export function RequestsTabs() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="text-xl font-semibold tracking-tight" data-onboarding="requests-title">
          Metric Requests
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/metric-requests/templates"
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-sm text-text-secondary hover:bg-bg-hover"
            data-onboarding="templates-tab"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </Link>
          <Link
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            href="/metric-requests/new"
            data-onboarding="new-request"
          >
            <Plus className="h-4 w-4 sm:hidden" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New request</span>
          </Link>
        </div>
      </div>

      {/* Recurring Schedules (collapsible) */}
      <CollapsibleSchedules />

      {/* Campaign requests */}
      <CampaignsTabContent />
    </div>
  );
}

"use client";

import { Plus, FileText } from "lucide-react";

import { ButtonLink } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { CampaignsTabContent } from "@/components/investor/requests-tab-content";
import { CollapsibleSchedules } from "@/components/investor/collapsible-schedules";

export function RequestsTabs() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Dashboard", href: "/" }, { label: "Metric Requests" }]} />
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight" data-onboarding="requests-title">
            Metric Requests
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink
            href="/metric-requests/templates"
            variant="secondary"
            size="sm"
            data-onboarding="templates-tab"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Templates</span>
          </ButtonLink>
          <ButtonLink
            href="/metric-requests/new"
            size="sm"
            data-onboarding="new-request"
          >
            <Plus className="h-4 w-4 sm:hidden" />
            <span className="sm:hidden">New</span>
            <span className="hidden sm:inline">New request</span>
          </ButtonLink>
        </div>
      </div>

      {/* Recurring Schedules (collapsible) */}
      <CollapsibleSchedules />

      {/* Campaign requests */}
      <CampaignsTabContent />
    </div>
  );
}

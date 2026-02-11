"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { CampaignsTabContent } from "@/components/investor/campaigns-tab-content";
import { TemplatesTabContent } from "@/components/investor/templates-tab-content";
import { SchedulesTabContent } from "@/components/investor/schedules-tab-content";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type Tab = "campaigns" | "templates" | "schedules";

const TABS: TabItem<Tab>[] = [
  { value: "campaigns", label: "Requests" },
  { value: "templates", label: "Templates", dataOnboarding: "templates-tab" },
  { value: "schedules", label: "Schedules", dataOnboarding: "schedules-tab" },
];

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  campaigns: "One-time or recurring metric requests sent to your portfolio companies.",
  templates: "Reusable sets of metrics you can apply when creating new requests.",
  schedules: "Automated recurring requests that run on a quarterly or annual cadence.",
};

export function RequestsTabs() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : "campaigns";

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "campaigns") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(`/campaigns${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1" data-onboarding="requests-title">
          <h1 className="text-xl font-semibold tracking-tight">Metric Requests</h1>
          <p className="text-sm text-text-tertiary">
            Request metrics from portfolio companies. Use templates for reusable sets and schedules for recurring collection.
          </p>
        </div>
        <Link
          className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
          href="/campaigns/new"
          data-onboarding="new-request"
        >
          <Plus className="h-4 w-4 sm:hidden" />
          <span className="sm:hidden">New</span>
          <span className="hidden sm:inline">New request</span>
        </Link>
      </div>

      {/* Tab bar */}
      <SlidingTabs
        tabs={TABS}
        value={activeTab}
        onChange={setTab}
        size="sm"
        showIcons={false}
      />

      <p className="text-xs text-text-muted -mt-3">{TAB_DESCRIPTIONS[activeTab]}</p>

      {/* Tab content */}
      {activeTab === "campaigns" && <CampaignsTabContent />}
      {activeTab === "templates" && <TemplatesTabContent />}
      {activeTab === "schedules" && <SchedulesTabContent />}
    </div>
  );
}

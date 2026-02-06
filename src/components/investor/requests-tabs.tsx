"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { RequestsTabContent } from "@/components/investor/requests-tab-content";
import { TemplatesTabContent } from "@/components/investor/templates-tab-content";
import { SchedulesTabContent } from "@/components/investor/schedules-tab-content";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

type Company = {
  id: string;
  name: string;
};

type Tab = "requests" | "templates" | "schedules";

const TABS: TabItem<Tab>[] = [
  { value: "requests", label: "Requests" },
  { value: "templates", label: "Templates" },
  { value: "schedules", label: "Schedules" },
];

export function RequestsTabs({
  companies,
}: {
  companies: Company[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = tabParam && TABS.some((t) => t.value === tabParam) ? tabParam : "requests";

  function setTab(tab: Tab) {
    const params = new URLSearchParams(searchParams.toString());
    if (tab === "requests") {
      params.delete("tab");
    } else {
      params.set("tab", tab);
    }
    const query = params.toString();
    router.push(`/requests${query ? `?${query}` : ""}`, { scroll: false });
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1" data-onboarding="requests-title">
          <h1 className="text-xl font-semibold tracking-tight">Requests</h1>
          <p className="text-sm text-white/60">
            Create and track metric requests across your portfolio.
          </p>
        </div>
        <Link
          className="inline-flex h-9 flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black hover:bg-white/90"
          href="/requests/new"
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

      {/* Tab content */}
      {activeTab === "requests" && (
        <RequestsTabContent companies={companies} />
      )}
      {activeTab === "templates" && <TemplatesTabContent />}
      {activeTab === "schedules" && <SchedulesTabContent />}
    </div>
  );
}

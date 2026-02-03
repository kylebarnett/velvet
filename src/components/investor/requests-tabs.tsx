"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";

import { RequestsTabContent } from "@/components/investor/requests-tab-content";
import { TemplatesTabContent } from "@/components/investor/templates-tab-content";
import { SchedulesTabContent } from "@/components/investor/schedules-tab-content";

type Request = {
  id: string;
  period_start: string;
  period_end: string;
  status: string;
  due_date: string | null;
  created_at: string;
  company_id: string;
  companies: { id: string; name: string } | { id: string; name: string }[] | null;
  metric_definitions: { name: string; period_type: string } | { name: string; period_type: string }[] | null;
};

type Company = {
  id: string;
  name: string;
};

type Tab = "requests" | "templates" | "schedules";

const TABS: { id: Tab; label: string }[] = [
  { id: "requests", label: "Requests" },
  { id: "templates", label: "Templates" },
  { id: "schedules", label: "Schedules" },
];

export function RequestsTabs({
  requests,
  companies,
}: {
  requests: Request[];
  companies: Company[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as Tab | null;
  const activeTab: Tab = tabParam && TABS.some((t) => t.id === tabParam) ? tabParam : "requests";

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
      <div className="flex border-b border-white/10">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "requests" && (
        <RequestsTabContent requests={requests} companies={companies} />
      )}
      {activeTab === "templates" && <TemplatesTabContent />}
      {activeTab === "schedules" && <SchedulesTabContent />}
    </div>
  );
}

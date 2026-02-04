"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FounderDashboardClient } from "@/components/founder/founder-dashboard-client";
import { DocumentsTab } from "@/components/founder/documents-tab";
import { TearSheetsTab } from "@/components/founder/tear-sheets-tab";
import { MetricValue } from "@/components/dashboard";

type Tab = "metrics" | "documents" | "tear-sheets";

type DashboardView = {
  id: string;
  name: string;
  is_default: boolean;
  layout: unknown;
};

type DashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  target_industry: string | null;
  layout: unknown;
  is_system: boolean;
};

interface FounderPortalTabsProps {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  metrics: MetricValue[];
  views: DashboardView[];
  templates: DashboardTemplate[];
}

const tabs: { value: Tab; label: string }[] = [
  { value: "metrics", label: "Metrics" },
  { value: "documents", label: "Documents" },
  { value: "tear-sheets", label: "Tear Sheets" },
];

export function FounderPortalTabs({
  companyId,
  companyName,
  companyIndustry,
  metrics,
  views,
  templates,
}: FounderPortalTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = (
    tabParam === "documents" || tabParam === "tear-sheets" ? tabParam : "metrics"
  ) as Tab;

  function handleTabChange(tab: Tab) {
    if (tab === "metrics") {
      router.push("/portal");
    } else {
      router.push(`/portal?tab=${tab}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with title and tabs */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/60">
            Visualize your company metrics and track performance.
          </p>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5 w-fit">
          {tabs.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => handleTabChange(t.value)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                activeTab === t.value
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {activeTab === "metrics" && (
        <FounderDashboardClient
          companyId={companyId}
          companyName={companyName}
          companyIndustry={companyIndustry}
          metrics={metrics}
          views={views}
          templates={templates}
        />
      )}

      {activeTab === "documents" && <DocumentsTab companyId={companyId} />}

      {activeTab === "tear-sheets" && <TearSheetsTab />}
    </div>
  );
}

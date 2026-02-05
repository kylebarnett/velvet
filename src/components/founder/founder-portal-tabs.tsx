"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { BarChart3, FileText, FileSpreadsheet } from "lucide-react";
import { FounderDashboardClient } from "@/components/founder/founder-dashboard-client";
import { DocumentsTab } from "@/components/founder/documents-tab";
import { TearSheetsTab } from "@/components/founder/tear-sheets-tab";
import { MetricValue } from "@/components/dashboard";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

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
  /** Optional document count for badge */
  documentCount?: number;
  /** Optional tear sheet count for badge */
  tearSheetCount?: number;
}

export function FounderPortalTabs({
  companyId,
  companyName,
  companyIndustry,
  metrics,
  views,
  templates,
  documentCount,
  tearSheetCount,
}: FounderPortalTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: Tab = (
    tabParam === "documents" || tabParam === "tear-sheets" ? tabParam : "metrics"
  ) as Tab;

  // Compute unique metrics count
  const uniqueMetricNames = React.useMemo(() => {
    const names = new Set<string>();
    metrics.forEach((m) => names.add(m.metric_name));
    return names.size;
  }, [metrics]);

  const tabs: TabItem<Tab>[] = [
    { value: "metrics", label: "Metrics", icon: BarChart3, badge: uniqueMetricNames || undefined },
    { value: "documents", label: "Documents", icon: FileText, badge: documentCount },
    { value: "tear-sheets", label: "Tear Sheets", icon: FileSpreadsheet, badge: tearSheetCount },
  ];

  function handleTabChange(tab: Tab) {
    if (tab === "metrics") {
      router.push("/portal");
    } else {
      router.push(`/portal?tab=${tab}`);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="space-y-4">
        {/* Title row */}
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-white/50">
            Visualize your company metrics and track performance.
          </p>
        </div>

        {/* Tab navigation */}
        <SlidingTabs
          tabs={tabs}
          value={activeTab}
          onChange={handleTabChange}
          variant="underline"
        />
      </div>

      {/* Tab content with fade-in animation */}
      <div
        key={activeTab}
        className="animate-fade-in"
      >
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
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import { ActivityPanel } from "@/components/investor/activity-panel";
import { AddCompanyFlow } from "@/components/investor/add-company-flow";
import { DashboardContent } from "./dashboard-content";

type MetricSnapshot = {
  name: string;
  value: number | null;
  previousValue: number | null;
  percentChange: number | null;
  periodLabel: string | null;
};

type Company = {
  id: string;
  name: string;
  website: string | null;
  founder_id: string | null;
  stage: string | null;
  industry: string | null;
  approvalStatus: string;
  logoUrl: string | null;
  isHidden: boolean;
  tilePrimaryMetric: string | null;
  tileSecondaryMetric: string | null;
};

type DashboardTab = "portfolio" | "activity";

const TABS: TabItem<DashboardTab>[] = [
  { value: "portfolio", label: "Portfolio" },
  { value: "activity", label: "Activity" },
];

interface DashboardTabsProps {
  companies: Company[];
  latestMetrics: Record<string, MetricSnapshot>;
  secondaryMetrics: Record<string, MetricSnapshot>;
  lastSubmittedAt: Record<string, string>;
}

export function DashboardTabs({
  companies,
  latestMetrics,
  secondaryMetrics,
  lastSubmittedAt,
}: DashboardTabsProps) {
  const [activeTab, setActiveTab] = React.useState<DashboardTab>("portfolio");

  return (
    <div className="space-y-6">
      <SlidingTabs
        tabs={TABS}
        value={activeTab}
        onChange={setActiveTab}
        size="sm"
      />

      {activeTab === "portfolio" ? (
        companies.length === 0 ? (
          <div className="py-8">
            <h3 className="text-base font-medium text-text-primary">
              No companies in your portfolio yet
            </h3>
            <p className="mt-1 max-w-lg text-sm text-text-secondary">
              Add a company to start tracking metrics, or import your portfolio
              in bulk. Once added, invite founders to connect and begin
              submitting data.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <AddCompanyFlow />
              <Link
                href="/contacts/import"
                className="text-sm text-text-tertiary underline underline-offset-2 hover:text-text-secondary"
              >
                Or import in bulk
              </Link>
            </div>
          </div>
        ) : (
          <DashboardContent
            companies={companies}
            latestMetrics={latestMetrics}
            secondaryMetrics={secondaryMetrics}
            lastSubmittedAt={lastSubmittedAt}
          />
        )
      ) : (
        <ActivityPanel />
      )}
    </div>
  );
}

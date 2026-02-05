"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BarChart3, FileText, FileSpreadsheet } from "lucide-react";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";

export type CompanyTabValue = "metrics" | "documents" | "tear-sheets";

const COMPANY_TABS: TabItem<CompanyTabValue>[] = [
  { value: "metrics", label: "Metrics", icon: BarChart3 },
  { value: "documents", label: "Documents", icon: FileText },
  { value: "tear-sheets", label: "Tear Sheets", icon: FileSpreadsheet },
];

type CompanyDashboardTabsProps = {
  companyId: string;
};

export function CompanyDashboardTabs({ companyId }: CompanyDashboardTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as CompanyTabValue) || "metrics";

  function handleTabChange(tab: CompanyTabValue) {
    const url = new URL(window.location.href);
    if (tab === "metrics") {
      url.searchParams.delete("tab");
    } else {
      url.searchParams.set("tab", tab);
    }
    router.replace(url.pathname + url.search, { scroll: false });
  }

  return (
    <SlidingTabs
      tabs={COMPANY_TABS}
      value={activeTab}
      onChange={handleTabChange}
      size="sm"
      showIcons={true}
    />
  );
}

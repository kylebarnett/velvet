"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { SavedReportsDropdown } from "./saved-reports-dropdown";
import { SaveReportModal } from "./save-report-modal";

type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  filters: Record<string, unknown>;
  company_ids: string[];
  normalize: string;
  config: Record<string, unknown>;
  is_default: boolean;
  updated_at: string;
};

type ReportHeaderProps = {
  reportType: "summary" | "comparison" | "trend";
  currentFilters: {
    industries?: string;
    stages?: string;
    periodType?: string;
    startDate?: string;
    endDate?: string;
  };
  companyIds?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
};

export function ReportHeader({
  reportType,
  currentFilters,
  companyIds = [],
  normalize = "absolute",
  config = {},
}: ReportHeaderProps) {
  const router = useRouter();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null);

  const handleLoadReport = useCallback(
    (report: SavedReport) => {
      setCurrentReport(report);

      // Build URL params from saved report
      const params = new URLSearchParams();

      const filters = report.filters as Record<string, string>;
      if (filters.industries) params.set("industries", filters.industries);
      if (filters.stages) params.set("stages", filters.stages);
      if (filters.periodType) params.set("periodType", filters.periodType);
      if (filters.startDate) params.set("startDate", filters.startDate);
      if (filters.endDate) params.set("endDate", filters.endDate);

      // For comparison reports
      if (report.company_ids?.length > 0) {
        params.set("companies", report.company_ids.join(","));
      }
      if (report.normalize && report.normalize !== "absolute") {
        params.set("normalize", report.normalize);
      }

      const reportConfig = report.config as Record<string, string>;
      if (reportConfig?.metric) {
        params.set("metric", reportConfig.metric);
      }

      router.push(`?${params.toString()}`);
    },
    [router]
  );

  const handleSaveReport = (saved: { id: string; name: string }) => {
    setCurrentReport((prev) =>
      prev ? { ...prev, id: saved.id, name: saved.name } : null
    );
  };

  // Build current state for saving
  const buildFiltersObject = () => {
    const filters: Record<string, string> = {};
    if (currentFilters.industries) filters.industries = currentFilters.industries;
    if (currentFilters.stages) filters.stages = currentFilters.stages;
    if (currentFilters.periodType) filters.periodType = currentFilters.periodType;
    if (currentFilters.startDate) filters.startDate = currentFilters.startDate;
    if (currentFilters.endDate) filters.endDate = currentFilters.endDate;
    return filters;
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <SavedReportsDropdown
          reportType={reportType}
          onLoad={handleLoadReport}
        />

        {currentReport && (
          <div className="flex items-center gap-2 rounded-full bg-blue-500/10 py-1.5 pl-3 pr-2 ring-1 ring-blue-500/20">
            <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
            <span className="text-sm font-medium text-blue-300">{currentReport.name}</span>
            <button
              onClick={() => setCurrentReport(null)}
              className="rounded-full p-1 text-blue-300/60 transition-colors hover:bg-blue-500/20 hover:text-blue-200"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      <button
        onClick={() => setShowSaveModal(true)}
        className="group flex items-center gap-2 rounded-xl bg-gradient-to-r from-white/10 to-white/5 px-4 py-2.5 text-sm font-medium text-white ring-1 ring-white/10 transition-all duration-200 hover:from-white/15 hover:to-white/10 hover:ring-white/20"
      >
        <svg
          className="h-4 w-4 text-white/60 transition-colors group-hover:text-white"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
          />
        </svg>
        {currentReport ? "Update Report" : "Save Report"}
      </button>

      <SaveReportModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        onSave={handleSaveReport}
        reportType={reportType}
        filters={buildFiltersObject()}
        companyIds={companyIds}
        normalize={normalize}
        config={config}
        existingReportId={currentReport?.id}
        existingReportName={currentReport?.name}
      />
    </div>
  );
}

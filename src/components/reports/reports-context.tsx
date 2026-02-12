"use client";

import * as React from "react";

export type ReportConfig = {
  reportType: "summary" | "comparison" | "benchmarks" | "trends";
  filters: Record<string, unknown>;
  companyIds?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
};

export type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  is_default: boolean;
  filters?: Record<string, unknown>;
  company_ids?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
};

type ReportsContextValue = {
  currentConfig: ReportConfig | null;
  setCurrentConfig: (config: ReportConfig) => void;
  loadedReport: SavedReport | null;
  loadReport: (report: SavedReport) => void;
  clearLoadedReport: () => void;
  activeReportId: string | null;
  activeReportName: string | null;
  isDirty: boolean;
  setActiveReport: (id: string | null, name: string | null) => void;
  markDirty: () => void;
  markClean: () => void;
};

const ReportsContext = React.createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [currentConfig, setCurrentConfigRaw] = React.useState<ReportConfig | null>(null);
  const [loadedReport, setLoadedReport] = React.useState<SavedReport | null>(null);
  const [activeReportId, setActiveReportId] = React.useState<string | null>(null);
  const [activeReportName, setActiveReportName] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);

  const setCurrentConfig = React.useCallback((config: ReportConfig) => {
    setCurrentConfigRaw((prev) => {
      // If we have an active report and config changed, mark dirty
      if (prev && activeReportId) {
        const prevStr = JSON.stringify(prev);
        const nextStr = JSON.stringify(config);
        if (prevStr !== nextStr) {
          setIsDirty(true);
        }
      }
      return config;
    });
  }, [activeReportId]);

  const loadReport = React.useCallback((report: SavedReport) => {
    setLoadedReport(report);
    setActiveReportId(report.id);
    setActiveReportName(report.name);
    setIsDirty(false);
  }, []);

  const clearLoadedReport = React.useCallback(() => {
    setLoadedReport(null);
  }, []);

  const setActiveReport = React.useCallback((id: string | null, name: string | null) => {
    setActiveReportId(id);
    setActiveReportName(name);
    setIsDirty(false);
  }, []);

  const markDirty = React.useCallback(() => setIsDirty(true), []);
  const markClean = React.useCallback(() => setIsDirty(false), []);

  const value = React.useMemo(
    () => ({
      currentConfig,
      setCurrentConfig,
      loadedReport,
      loadReport,
      clearLoadedReport,
      activeReportId,
      activeReportName,
      isDirty,
      setActiveReport,
      markDirty,
      markClean,
    }),
    [currentConfig, setCurrentConfig, loadedReport, loadReport, clearLoadedReport, activeReportId, activeReportName, isDirty, setActiveReport, markDirty, markClean]
  );

  return (
    <ReportsContext.Provider value={value}>
      {children}
    </ReportsContext.Provider>
  );
}

export function useReportsContext() {
  const ctx = React.useContext(ReportsContext);
  if (!ctx) {
    throw new Error("useReportsContext must be used within a ReportsProvider");
  }
  return ctx;
}

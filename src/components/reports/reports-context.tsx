"use client";

import * as React from "react";
import type { ReportType } from "@/lib/reports/templates";
import { getDefaultSections } from "@/lib/reports/templates";

export type { ReportType };

export type ReportConfig = {
  reportType: ReportType;
  filters: Record<string, unknown>;
  companyIds?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
  visibleSections?: string[];
};

export type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: ReportType;
  is_default: boolean;
  filters?: Record<string, unknown>;
  company_ids?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
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
  visibleSections: string[];
  toggleSection: (sectionId: string) => void;
  resetSections: (reportType: ReportType) => void;
  setVisibleSections: (sections: string[]) => void;
};

const ReportsContext = React.createContext<ReportsContextValue | null>(null);

export function ReportsProvider({ children }: { children: React.ReactNode }) {
  const [currentConfig, setCurrentConfigRaw] = React.useState<ReportConfig | null>(null);
  const [loadedReport, setLoadedReport] = React.useState<SavedReport | null>(null);
  const [activeReportId, setActiveReportId] = React.useState<string | null>(null);
  const [activeReportName, setActiveReportName] = React.useState<string | null>(null);
  const [isDirty, setIsDirty] = React.useState(false);
  const [visibleSections, setVisibleSectionsRaw] = React.useState<string[]>([]);

  const setCurrentConfig = React.useCallback((config: ReportConfig) => {
    setCurrentConfigRaw((prev) => {
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
    const savedSections = (report.config as Record<string, unknown> | undefined)?.visibleSections;
    if (Array.isArray(savedSections)) {
      setVisibleSectionsRaw(savedSections as string[]);
    } else {
      setVisibleSectionsRaw(getDefaultSections(report.report_type));
    }
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

  const toggleSection = React.useCallback((sectionId: string) => {
    setVisibleSectionsRaw((prev) => {
      const next = prev.includes(sectionId)
        ? prev.filter((s) => s !== sectionId)
        : [...prev, sectionId];
      setIsDirty(true);
      return next;
    });
  }, []);

  const resetSections = React.useCallback((reportType: ReportType) => {
    setVisibleSectionsRaw(getDefaultSections(reportType));
    setIsDirty(true);
  }, []);

  const setVisibleSections = React.useCallback((sections: string[]) => {
    setVisibleSectionsRaw(sections);
  }, []);

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
      visibleSections,
      toggleSection,
      resetSections,
      setVisibleSections,
    }),
    [
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
      visibleSections,
      toggleSection,
      resetSections,
      setVisibleSections,
    ]
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

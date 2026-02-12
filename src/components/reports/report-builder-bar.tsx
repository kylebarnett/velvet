"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Save, Trash2, X, FileText } from "lucide-react";

import { useReportsContext, type SavedReport } from "./reports-context";
import { SaveReportModal } from "./save-report-modal";

// ── Filter option constants ──────────────────────────────────────

const INDUSTRIES = [
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "edtech", label: "EdTech" },
  { value: "ai_ml", label: "AI/ML" },
  { value: "other", label: "Other" },
];

const STAGES = [
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth", label: "Growth" },
];

// ── Component ────────────────────────────────────────────────────

export function ReportBuilderBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    currentConfig,
    loadReport,
    activeReportId,
    activeReportName,
    isDirty,
    setActiveReport,
    markClean,
  } = useReportsContext();

  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [savedOpen, setSavedOpen] = React.useState(false);
  const [savedReports, setSavedReports] = React.useState<SavedReport[]>([]);
  const [loadingReports, setLoadingReports] = React.useState(false);
  const savedRef = React.useRef<HTMLDivElement>(null);

  const reportType = currentConfig?.reportType ?? "summary";

  // Parse current filters from URL
  const industries = searchParams.get("industries")?.split(",").filter(Boolean) ?? [];
  const stages = searchParams.get("stages")?.split(",").filter(Boolean) ?? [];
  const hasFilters = industries.length > 0 || stages.length > 0;

  // ── URL filter helpers ──────────────────────────────────────

  const updateFilters = React.useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const toggleIndustry = (value: string) => {
    const updated = industries.includes(value)
      ? industries.filter((i) => i !== value)
      : [...industries, value];
    updateFilters("industries", updated.length > 0 ? updated.join(",") : null);
  };

  const toggleStage = (value: string) => {
    const updated = stages.includes(value)
      ? stages.filter((s) => s !== value)
      : [...stages, value];
    updateFilters("stages", updated.length > 0 ? updated.join(",") : null);
  };

  const clearFilters = () => {
    router.push("?");
    setActiveReport(null, null);
  };

  // ── Saved reports popover ───────────────────────────────────

  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (savedRef.current && !savedRef.current.contains(e.target as Node)) {
        setSavedOpen(false);
      }
    }
    if (savedOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [savedOpen]);

  async function fetchSavedReports() {
    setLoadingReports(true);
    try {
      const res = await fetch(`/api/investors/portfolio/reports?reportType=${reportType}`);
      const json = await res.json();
      if (res.ok) setSavedReports(json.reports ?? []);
    } finally {
      setLoadingReports(false);
    }
  }

  function handleToggleSaved() {
    if (!savedOpen) fetchSavedReports();
    setSavedOpen(!savedOpen);
  }

  function handleLoadReport(report: SavedReport) {
    loadReport(report);
    setSavedOpen(false);

    // Apply the saved report's filters to the URL
    const params = new URLSearchParams();
    const filters = report.filters as Record<string, unknown> | undefined;
    if (filters?.industries && typeof filters.industries === "string") {
      params.set("industries", filters.industries);
    }
    if (filters?.stages && typeof filters.stages === "string") {
      params.set("stages", filters.stages);
    }
    router.push(`?${params.toString()}`);
  }

  async function handleDeleteReport(id: string) {
    await fetch(`/api/investors/portfolio/reports/${id}`, { method: "DELETE" });
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
    if (activeReportId === id) {
      setActiveReport(null, null);
    }
  }

  function handleCreateNew() {
    setActiveReport(null, null);
    router.push("?");
    setSavedOpen(false);
  }

  // ── Save handler ────────────────────────────────────────────

  async function handleSave(data: { name: string; description: string; isDefault: boolean }) {
    if (!currentConfig) return;
    setSaving(true);
    try {
      const res = await fetch("/api/investors/portfolio/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          reportType: currentConfig.reportType,
          filters: currentConfig.filters,
          companyIds: currentConfig.companyIds,
          normalize: currentConfig.normalize,
          config: currentConfig.config,
          isDefault: data.isDefault,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setActiveReport(json.id ?? null, data.name);
        markClean();
        setShowSaveModal(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // ── Render ──────────────────────────────────────────────────

  return (
    <div className="card-surface rounded-xl border border-border-subtle">
      <div className="p-4">
        {/* Row 1: Saved reports selector + time range (handled by parent) */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Saved reports selector */}
          <div className="relative" ref={savedRef}>
            <button
              type="button"
              onClick={handleToggleSaved}
              className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-elevated"
            >
              <FileText className="h-3 w-3 text-text-muted" />
              <span className="max-w-[180px] truncate">
                {activeReportName ?? "New Report"}
              </span>
              {isDirty && (
                <span className="text-text-muted">(unsaved)</span>
              )}
              <ChevronDown className="h-3 w-3 text-text-muted" />
            </button>

            {savedOpen && (
              <div className="absolute left-0 top-full z-50 mt-1 min-w-[260px] max-h-[320px] overflow-y-auto rounded-xl border border-border-default bg-bg-secondary shadow-xl">
                {loadingReports ? (
                  <div className="px-4 py-6 text-center text-xs text-text-muted">Loading...</div>
                ) : savedReports.length === 0 ? (
                  <div className="px-4 py-6 text-center text-xs text-text-muted">
                    No saved reports
                  </div>
                ) : (
                  savedReports.map((report) => (
                    <div
                      key={report.id}
                      className={`flex items-center justify-between gap-2 px-3 py-2.5 transition-colors hover:bg-bg-elevated ${
                        report.id === activeReportId ? "bg-bg-elevated" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleLoadReport(report)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="truncate text-xs font-medium text-text-primary">
                          {report.name}
                          {report.is_default && (
                            <span className="ml-1.5 rounded bg-bg-hover px-1 py-0.5 text-[10px] text-text-muted">
                              Default
                            </span>
                          )}
                        </div>
                        {report.description && (
                          <div className="mt-0.5 truncate text-[10px] text-text-muted">
                            {report.description}
                          </div>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteReport(report.id);
                        }}
                        className="shrink-0 rounded p-1 text-text-faint transition-colors hover:bg-[var(--error-bg-subtle)] hover:text-[var(--error-accent)]"
                        aria-label={`Delete ${report.name}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))
                )}

                {/* Create new */}
                <div className="border-t border-border-subtle">
                  <button
                    type="button"
                    onClick={handleCreateNew}
                    className="w-full px-3 py-2.5 text-left text-xs font-medium text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-primary"
                  >
                    + New Report
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Save actions — pushed right */}
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSaveModal(true)}
              disabled={!currentConfig}
              className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-bg-elevated disabled:opacity-60"
            >
              <Save className="h-3 w-3" />
              {activeReportId ? "Save As" : "Save"}
            </button>
          </div>
        </div>

        {/* Row 2: Industry + Stage filter chips */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Industry</span>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRIES.map((option) => {
              const isSelected = industries.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleIndustry(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] ring-1 ring-[var(--tag-blue-bg)]"
                      : "bg-bg-raised text-text-muted ring-1 ring-border-subtle hover:bg-bg-elevated hover:text-text-secondary"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Stage</span>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((option) => {
              const isSelected = stages.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleStage(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] ring-1 ring-[var(--tag-emerald-bg)]"
                      : "bg-bg-raised text-text-muted ring-1 ring-border-subtle hover:bg-bg-elevated hover:text-text-secondary"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Clear filters */}
          {hasFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-primary"
            >
              <X className="h-3 w-3" />
              Clear filters
            </button>
          )}
        </div>
      </div>

      <SaveReportModal
        open={showSaveModal}
        reportType={reportType}
        onSave={handleSave}
        onCancel={() => setShowSaveModal(false)}
        saving={saving}
      />
    </div>
  );
}

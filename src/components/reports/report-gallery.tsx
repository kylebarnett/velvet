"use client";

import * as React from "react";
import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ReportCard } from "./report-card";
import type { SavedReport } from "./reports-context";
import { REPORT_TYPE_LABELS, type ReportType } from "@/lib/reports/templates";

const TYPE_TABS: Array<{ value: ReportType | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "summary", label: "Summary" },
  { value: "comparison", label: "Comparison" },
  { value: "benchmarks", label: "Benchmarks" },
  { value: "deep_dive", label: "Deep Dive" },
];

type ReportGalleryProps = {
  initialReports: SavedReport[];
  onReportsChange?: (reports: SavedReport[]) => void;
};

export function ReportGallery({ initialReports, onReportsChange }: ReportGalleryProps) {
  const [reports, setReportsLocal] = React.useState(initialReports);
  const [activeTab, setActiveTab] = React.useState<ReportType | "all">("all");
  const [renaming, setRenaming] = React.useState<SavedReport | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

  // Sync with parent when initialReports changes
  React.useEffect(() => {
    setReportsLocal(initialReports);
  }, [initialReports]);

  function setReports(updater: (prev: SavedReport[]) => SavedReport[]) {
    setReportsLocal((prev) => {
      const next = updater(prev);
      onReportsChange?.(next);
      return next;
    });
  }

  const filtered = activeTab === "all"
    ? reports
    : reports.filter((r) => r.report_type === activeTab);

  async function handleDuplicate(report: SavedReport) {
    const res = await fetch("/api/investors/portfolio/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${report.name} (copy)`,
        description: report.description || undefined,
        reportType: report.report_type,
        filters: report.filters,
        companyIds: report.company_ids,
        normalize: report.normalize,
        config: report.config,
      }),
    });
    if (res.ok) {
      const json = await res.json();
      setReports((prev) => [
        {
          ...report,
          id: json.id,
          name: `${report.name} (copy)`,
          is_default: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    }
  }

  function handleRenameStart(report: SavedReport) {
    setRenaming(report);
    setRenameValue(report.name);
  }

  async function handleRenameSubmit() {
    if (!renaming || !renameValue.trim()) return;
    const res = await fetch(`/api/investors/portfolio/reports/${renaming.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: renameValue.trim() }),
    });
    if (res.ok) {
      setReports((prev) =>
        prev.map((r) =>
          r.id === renaming.id ? { ...r, name: renameValue.trim() } : r
        )
      );
    }
    setRenaming(null);
  }

  async function handleDelete(report: SavedReport) {
    const res = await fetch(`/api/investors/portfolio/reports/${report.id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    }
  }

  return (
    <div className="space-y-4">
      {/* Type filter tabs */}
      <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-1">
        {TYPE_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setActiveTab(tab.value)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-bg-primary text-text-primary shadow-sm"
                : "text-text-tertiary hover:text-text-secondary"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Gallery grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-default py-16">
          <FileText className="h-10 w-10 text-text-faint" />
          <h3 className="mt-3 text-sm font-medium text-text-primary">No reports yet</h3>
          <p className="mt-1 text-xs text-text-muted">
            {activeTab === "all"
              ? "Choose a template above to create your first report"
              : `No ${REPORT_TYPE_LABELS[activeTab as ReportType] ?? activeTab} reports yet`}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDuplicate={handleDuplicate}
              onRename={handleRenameStart}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* Rename modal */}
      {renaming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-border-default bg-bg-secondary p-6">
            <h3 className="text-lg font-medium text-text-primary">Rename Report</h3>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              className="mt-3 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setRenaming(null);
              }}
            />
            <div className="mt-4 flex justify-end gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRenaming(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim()}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

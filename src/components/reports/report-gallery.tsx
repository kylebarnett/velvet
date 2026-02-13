"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, FileText } from "lucide-react";
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
};

export function ReportGallery({ initialReports }: ReportGalleryProps) {
  const router = useRouter();
  const [reports, setReports] = React.useState(initialReports);
  const [activeTab, setActiveTab] = React.useState<ReportType | "all">("all");
  const [renaming, setRenaming] = React.useState<SavedReport | null>(null);
  const [renameValue, setRenameValue] = React.useState("");

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-text-primary"
            data-onboarding="reports-title"
          >
            Reports
          </h1>
          <p className="mt-1 text-sm text-text-tertiary">
            Create, customize, and export portfolio reports
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/reports/new")}
          className="inline-flex items-center gap-2 rounded-lg bg-text-primary px-4 py-2 text-sm font-medium text-bg-primary transition-colors hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Create Report
        </button>
      </div>

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
              ? "Create your first report to get started"
              : `No ${REPORT_TYPE_LABELS[activeTab as ReportType] ?? activeTab} reports yet`}
          </p>
          <button
            type="button"
            onClick={() => router.push("/reports/new")}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border-default bg-bg-primary px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:bg-bg-elevated"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Report
          </button>
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

          {/* Create new card */}
          <button
            type="button"
            onClick={() => router.push("/reports/new")}
            className="flex min-h-[140px] flex-col items-center justify-center rounded-xl border border-dashed border-border-default p-4 text-text-muted transition-all hover:border-border-hover hover:bg-bg-elevated hover:text-text-secondary"
          >
            <Plus className="h-6 w-6" />
            <span className="mt-2 text-xs font-medium">New Report</span>
          </button>
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
              className="mt-3 h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white focus:border-white/20 focus:outline-none"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRenameSubmit();
                if (e.key === "Escape") setRenaming(null);
              }}
            />
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setRenaming(null)}
                className="rounded-lg border border-border-default px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-bg-elevated"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRenameSubmit}
                disabled={!renameValue.trim()}
                className="rounded-lg bg-text-primary px-3 py-1.5 text-xs font-medium text-bg-primary transition-colors hover:opacity-90 disabled:opacity-60"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

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

type SavedReportsDropdownProps = {
  reportType: string;
  onLoad: (report: SavedReport) => void;
};

export function SavedReportsDropdown({
  reportType,
  onLoad,
}: SavedReportsDropdownProps) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`/api/investors/portfolio/reports?type=${reportType}`);
        if (res.ok) {
          const data = await res.json();
          setReports(data.reports);
        }
      } catch (err) {
        console.error("Failed to fetch saved reports:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [reportType]);

  const handleDelete = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();

    if (deleteConfirm !== reportId) {
      setDeleteConfirm(reportId);
      return;
    }

    try {
      const res = await fetch(`/api/investors/portfolio/reports/${reportId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setReports(reports.filter((r) => r.id !== reportId));
        setDeleteConfirm(null);
      }
    } catch (err) {
      console.error("Failed to delete report:", err);
    }
  };

  if (loading) {
    return (
      <div className="h-10 w-40 animate-pulse rounded-xl bg-white/[0.05]" />
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="group flex h-10 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-gradient-to-r from-white/[0.05] to-transparent px-4 text-sm font-medium text-white/80 transition-all hover:border-white/[0.15] hover:text-white"
      >
        <svg
          className="h-4 w-4 text-white/50 transition-colors group-hover:text-white/70"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
          />
        </svg>
        <span>Saved Reports</span>
        {reports.length > 0 && (
          <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-white/10 px-1.5 text-xs text-white/60">
            {reports.length}
          </span>
        )}
        <svg
          className={`h-4 w-4 text-white/40 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false);
              setDeleteConfirm(null);
            }}
          />
          <div className="absolute left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-white/[0.08] bg-zinc-900/95 shadow-2xl backdrop-blur-xl">
            {/* Header */}
            <div className="border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent px-4 py-3">
              <div className="text-sm font-medium text-white">Your Saved Reports</div>
              <div className="text-xs text-white/40">Click to load a saved configuration</div>
            </div>

            {reports.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
                  <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                  </svg>
                </div>
                <p className="text-sm text-white/50">No saved reports yet</p>
                <p className="mt-1 text-xs text-white/30">
                  Save your current filters to quickly access them later
                </p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto p-2">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    onClick={() => {
                      onLoad(report);
                      setIsOpen(false);
                    }}
                    className="group relative cursor-pointer rounded-lg p-3 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-medium text-white">
                            {report.name}
                          </span>
                          {report.is_default && (
                            <span className="flex items-center gap-1 rounded-full bg-blue-500/15 px-2 py-0.5 text-[10px] font-medium text-blue-300 ring-1 ring-blue-500/20">
                              <svg className="h-2.5 w-2.5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                              Default
                            </span>
                          )}
                        </div>
                        {report.description && (
                          <div className="mt-0.5 truncate text-xs text-white/40">
                            {report.description}
                          </div>
                        )}
                        <div className="mt-1.5 text-[10px] text-white/30">
                          Updated {new Date(report.updated_at).toLocaleDateString()}
                        </div>
                      </div>

                      {/* Delete button */}
                      <button
                        onClick={(e) => handleDelete(e, report.id)}
                        className={`flex-shrink-0 rounded-lg p-1.5 transition-all ${
                          deleteConfirm === report.id
                            ? "bg-red-500/20 text-red-400"
                            : "text-white/30 opacity-0 hover:bg-white/[0.05] hover:text-white/60 group-hover:opacity-100"
                        }`}
                        title={deleteConfirm === report.id ? "Click again to confirm" : "Delete report"}
                      >
                        {deleteConfirm === report.id ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                          </svg>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

type SaveReportModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (report: { id: string; name: string }) => void;
  reportType: string;
  filters: Record<string, unknown>;
  companyIds?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
  existingReportId?: string;
  existingReportName?: string;
};

export function SaveReportModal({
  isOpen,
  onClose,
  onSave,
  reportType,
  filters,
  companyIds = [],
  normalize = "absolute",
  config = {},
  existingReportId,
  existingReportName,
}: SaveReportModalProps) {
  const [name, setName] = useState(existingReportName ?? "");
  const [description, setDescription] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName(existingReportName ?? "");
      setDescription("");
      setIsDefault(false);
      setError(null);
    }
  }, [isOpen, existingReportName]);

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Please enter a report name.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const url = existingReportId
        ? `/api/investors/portfolio/reports/${existingReportId}`
        : "/api/investors/portfolio/reports";

      const method = existingReportId ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          reportType,
          filters,
          companyIds,
          normalize,
          config,
          isDefault,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save report");
      }

      const data = await res.json();
      onSave(data.report);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save report");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-900 shadow-2xl">
        {/* Gradient accent */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />

        {/* Header */}
        <div className="relative border-b border-white/[0.06] bg-gradient-to-b from-white/[0.03] to-transparent p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-500/5 ring-1 ring-blue-500/20">
              <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                {existingReportId ? "Update Report" : "Save Report"}
              </h2>
              <p className="text-sm text-white/50">
                {existingReportId ? "Update your saved configuration" : "Save your current filters and settings"}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-5">
            {/* Name */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Report Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Q4 SaaS Portfolio"
                className="h-12 w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">
                Description
                <span className="ml-2 text-xs text-white/40">(optional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add notes about this report..."
                rows={3}
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
              />
            </div>

            {/* Default checkbox */}
            <label className="group flex cursor-pointer items-center gap-3 rounded-xl bg-white/[0.02] p-4 ring-1 ring-white/[0.06] transition-colors hover:bg-white/[0.04]">
              <div className="relative flex h-5 w-5 items-center justify-center">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="h-5 w-5 rounded-md border border-white/20 bg-black/30 transition-colors peer-checked:border-blue-500 peer-checked:bg-blue-500" />
                <svg
                  className="absolute h-3 w-3 text-white opacity-0 transition-opacity peer-checked:opacity-100"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <span className="text-sm font-medium text-white/80">Set as default</span>
                <p className="text-xs text-white/40">
                  Load this report automatically when viewing {reportType} reports
                </p>
              </div>
            </label>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                {error}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/[0.06] bg-gradient-to-b from-transparent to-white/[0.02] px-6 py-4">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 text-sm font-medium text-white/60 transition-colors hover:bg-white/[0.05] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-60"
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Saving...
              </span>
            ) : existingReportId ? (
              "Update Report"
            ) : (
              "Save Report"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

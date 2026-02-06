"use client";

import * as React from "react";
import { Save } from "lucide-react";

import { SaveReportModal } from "./save-report-modal";
import { SavedReportsDropdown } from "./saved-reports-dropdown";

type SavedReport = {
  id: string;
  name: string;
  description: string | null;
  report_type: string;
  is_default: boolean;
};

interface ReportHeaderProps {
  reportType: string;
  onLoadReport: (report: SavedReport) => void;
  currentFilters: Record<string, unknown>;
  companyIds?: string[];
  normalize?: string;
  config?: Record<string, unknown>;
}

export function ReportHeader({
  reportType,
  onLoadReport,
  currentFilters,
  companyIds,
  normalize,
  config,
}: ReportHeaderProps) {
  const [showSaveModal, setShowSaveModal] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  async function handleSave(data: {
    name: string;
    description: string;
    isDefault: boolean;
  }) {
    setSaving(true);
    try {
      const res = await fetch("/api/investors/portfolio/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          reportType,
          filters: currentFilters,
          companyIds,
          normalize,
          config,
          isDefault: data.isDefault,
        }),
      });
      if (res.ok) {
        setShowSaveModal(false);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    await fetch(`/api/investors/portfolio/reports/${id}`, {
      method: "DELETE",
    });
  }

  return (
    <div className="flex items-center gap-2">
      <SavedReportsDropdown
        reportType={reportType}
        onLoad={onLoadReport}
        onDelete={handleDelete}
      />

      <button
        type="button"
        onClick={() => setShowSaveModal(true)}
        className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-3 py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
      >
        <Save className="h-3 w-3" />
        Save
      </button>

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

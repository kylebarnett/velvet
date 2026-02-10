"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

type PerformanceSnapshot = {
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
  moic: number | null;
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
};

type InvestmentSnapshot = {
  company_name: string;
  invested_amount: number;
  current_value: number;
  realized_value: number;
};

type ReportFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  fundId: string;
  performance: PerformanceSnapshot | null;
  investments: InvestmentSnapshot[];
};

function toDateInputValue(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultTitle(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `Q${q} ${now.getFullYear()} LP Report`;
}

export function ReportFormModal({
  open,
  onClose,
  onSaved,
  fundId,
  performance,
  investments,
}: ReportFormModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState(defaultTitle());
  const [reportDate, setReportDate] = useState(toDateInputValue(new Date()));
  const [reportType, setReportType] = useState<"quarterly" | "annual" | "ad_hoc">("quarterly");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setTitle(defaultTitle());
      setReportDate(toDateInputValue(new Date()));
      setReportType("quarterly");
      setError(null);
    }
  }, [open]);

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  function buildContentSnapshot() {
    return {
      summary: performance
        ? {
            tvpi: performance.tvpi,
            dpi: performance.dpi,
            rvpi: performance.rvpi,
            irr: performance.irr,
            moic: performance.moic,
            totalInvested: performance.totalInvested,
            totalCurrentValue: performance.totalCurrentValue,
            totalRealizedValue: performance.totalRealizedValue,
          }
        : null,
      investments: investments.map((inv) => ({
        company: inv.company_name,
        invested: inv.invested_amount,
        current: inv.current_value,
        realized: inv.realized_value,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (!title.trim()) {
      setError("Report title is required.");
      setSaving(false);
      return;
    }

    if (!reportDate) {
      setError("Report date is required.");
      setSaving(false);
      return;
    }

    try {
      const res = await fetch(`/api/investors/funds/${fundId}/reports`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          report_date: reportDate,
          report_type: reportType,
          status: "draft",
          content: buildContentSnapshot(),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to create report.");

      const reportId = json.report?.id;
      if (reportId) {
        router.push(`/lp-reports/${fundId}/reports/${reportId}`);
      } else {
        onSaved();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Generate LP Report</h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary"
            type="button"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="e.g. Q4 2025 LP Report"
            />
          </div>

          {/* Report Date */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Report Date</label>
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
            />
          </div>

          {/* Report Type */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Report Type</label>
            <Select value={reportType} onValueChange={(v) => setReportType(v as "quarterly" | "annual" | "ad_hoc")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="annual">Annual</SelectItem>
                <SelectItem value="ad_hoc">Ad Hoc</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Performance snapshot info */}
          {performance && (
            <div className="rounded-md border border-border-subtle bg-bg-raised px-3 py-2 text-xs text-text-muted">
              Report will include a performance snapshot: TVPI{" "}
              {performance.tvpi?.toFixed(2) ?? "—"}, DPI{" "}
              {performance.dpi?.toFixed(2) ?? "—"}, MOIC{" "}
              {performance.moic?.toFixed(2) ?? "—"}, and{" "}
              {investments.length} investment{investments.length !== 1 ? "s" : ""}.
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
            >
              {saving ? "Generating..." : "Generate Report"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

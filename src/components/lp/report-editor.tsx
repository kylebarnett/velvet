"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Download, Trash2, Check } from "lucide-react";
import Link from "next/link";

import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import { RichTextEditor } from "@/components/founder/rich-text-editor";
import { ReportPreview } from "./report-preview";
import { ThemeSelector } from "./theme-selector";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  calculateTVPI,
  calculateDPI,
  calculateRVPI,
  calculateMOIC,
  type Investment,
} from "@/lib/lp/calculations";
import {
  getReportTheme,
  DEFAULT_THEME_ID,
  type ReportThemeId,
} from "@/lib/lp/report-themes";
import { cn } from "@/lib/utils/cn";

/* ---------- Types ---------- */

type InvestmentRow = {
  id: string;
  company_id: string;
  company_name: string;
  invested_amount: number;
  current_value: number;
  realized_value: number;
};

type LPReport = {
  id: string;
  fund_id: string;
  report_date: string;
  report_type: string;
  title: string;
  status: string;
  content: Record<string, unknown> | null;
};

type Fund = {
  id: string;
  name: string;
  vintage_year: number;
  fund_size: number | null;
  currency: string;
};

type ReportEditorProps = {
  fund: Fund;
  report: LPReport;
  investments: InvestmentRow[];
};

type ReportContent = {
  quarterlySummary?: string;
  selectedInvestmentIds?: string[];
  summary?: Record<string, unknown>;
  investments?: { id: string; company: string; invested: number; current: number; realized: number }[];
  generatedAt?: string;
  theme?: string;
};

type EditorTab = "edit" | "preview";

const EDITOR_TABS: TabItem<EditorTab>[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
];

/* ---------- Helpers ---------- */

function toDateInputValue(dateStr: string): string {
  // Handle ISO date strings
  const d = new Date(dateStr);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function fmtMultiple(value: number | null): string {
  if (value == null) return "-";
  return `${value.toFixed(2)}x`;
}

/* ---------- Component ---------- */

export function ReportEditor({ fund, report, investments }: ReportEditorProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  // Parse existing content for backward compatibility
  const existingContent = report.content as ReportContent | null;

  // Form state
  const [title, setTitle] = useState(report.title);
  const [reportDate, setReportDate] = useState(toDateInputValue(report.report_date));
  const [reportType, setReportType] = useState(report.report_type);
  const [status, setStatus] = useState(report.status);
  const [quarterlySummary, setQuarterlySummary] = useState(
    existingContent?.quarterlySummary ?? "",
  );
  const [themeId, setThemeId] = useState<ReportThemeId>(
    (existingContent?.theme as ReportThemeId) ?? DEFAULT_THEME_ID,
  );

  // Investment selection — default to all if no prior selection
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const saved = existingContent?.selectedInvestmentIds;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return new Set(saved);
    }
    return new Set(investments.map((inv) => inv.id));
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef({
    title: report.title,
    reportDate: toDateInputValue(report.report_date),
    reportType: report.report_type,
    status: report.status,
    quarterlySummary: existingContent?.quarterlySummary ?? "",
    themeId: (existingContent?.theme as ReportThemeId) ?? DEFAULT_THEME_ID,
    selectedIds: new Set(
      existingContent?.selectedInvestmentIds && Array.isArray(existingContent.selectedInvestmentIds) && existingContent.selectedInvestmentIds.length > 0
        ? existingContent.selectedInvestmentIds
        : investments.map((inv) => inv.id),
    ),
  });

  // Check dirty whenever form changes
  useEffect(() => {
    const init = initialRef.current;
    const dirty =
      title !== init.title ||
      reportDate !== init.reportDate ||
      reportType !== init.reportType ||
      status !== init.status ||
      quarterlySummary !== init.quarterlySummary ||
      themeId !== init.themeId ||
      selectedIds.size !== init.selectedIds.size ||
      [...selectedIds].some((id) => !init.selectedIds.has(id));
    setIsDirty(dirty);
  }, [title, reportDate, reportType, status, quarterlySummary, themeId, selectedIds]);

  // beforeunload warning
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Auto-dismiss success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Selected investments
  const selectedInvestments = useMemo(
    () => investments.filter((inv) => selectedIds.has(inv.id)),
    [investments, selectedIds],
  );

  // Live-calculated KPIs from selected investments
  const performance = useMemo(() => {
    const invData: Investment[] = selectedInvestments.map((inv) => ({
      invested_amount: inv.invested_amount,
      current_value: inv.current_value,
      realized_value: inv.realized_value,
    }));

    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalRealizedValue = 0;
    for (const inv of invData) {
      totalInvested += inv.invested_amount;
      totalCurrentValue += inv.current_value;
      totalRealizedValue += inv.realized_value;
    }

    return {
      tvpi: calculateTVPI(invData),
      dpi: calculateDPI(invData),
      rvpi: calculateRVPI(invData),
      irr: null as number | null, // IRR requires dated cash flows — omit in live preview
      moic: calculateMOIC(invData),
      totalInvested,
      totalCurrentValue,
      totalRealizedValue,
    };
  }, [selectedInvestments]);

  // Toggle investment selection
  const toggleInvestment = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (selectedIds.size === investments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(investments.map((inv) => inv.id)));
    }
  }, [selectedIds.size, investments]);

  // Save
  async function handleSave() {
    setSaving(true);
    setError(null);

    const content: Record<string, unknown> = {
      quarterlySummary,
      selectedInvestmentIds: [...selectedIds],
      theme: themeId,
      summary: {
        tvpi: performance.tvpi,
        dpi: performance.dpi,
        rvpi: performance.rvpi,
        irr: performance.irr,
        moic: performance.moic,
        totalInvested: performance.totalInvested,
        totalCurrentValue: performance.totalCurrentValue,
        totalRealizedValue: performance.totalRealizedValue,
      },
      investments: selectedInvestments.map((inv) => ({
        id: inv.id,
        company: inv.company_name,
        invested: inv.invested_amount,
        current: inv.current_value,
        realized: inv.realized_value,
      })),
      generatedAt: new Date().toISOString(),
    };

    try {
      const res = await fetch(
        `/api/investors/funds/${fund.id}/reports/${report.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            report_date: reportDate,
            report_type: reportType,
            status,
            content,
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save report.");

      // Update initial ref so dirty tracking resets
      initialRef.current = {
        title: title.trim(),
        reportDate,
        reportType,
        status,
        quarterlySummary,
        themeId,
        selectedIds: new Set(selectedIds),
      };
      setIsDirty(false);
      setSuccess("Report saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // Delete
  async function handleDelete() {
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/investors/funds/${fund.id}/reports/${report.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error ?? "Failed to delete report.");
      }

      router.push(`/lp-reports/${fund.id}?tab=reports`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
      setDeleting(false);
    }
  }

  // PDF export
  async function handleExportPdf() {
    if (!previewRef.current) return;
    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      const safeName = `${title.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
      await exportElementAsPdf(previewRef.current, safeName);
    } catch {
      setError("Failed to export PDF.");
    }
  }

  // Preview data for ReportPreview
  const previewInvestments = selectedInvestments.map((inv) => ({
    id: inv.id,
    company: inv.company_name,
    invested: inv.invested_amount,
    current: inv.current_value,
    realized: inv.realized_value,
  }));

  return (
    <div className="space-y-4">
      {/* Back link */}
      <Link
        href={`/lp-reports/${fund.id}?tab=reports`}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {fund.name}
      </Link>

      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{title || "Untitled Report"}</h1>
          {isDirty && (
            <p className="mt-0.5 text-xs text-amber-300/80">Unsaved changes</p>
          )}
        </div>
        <div className="flex items-center gap-2" data-no-print>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-red-300 hover:bg-red-500/10 hover:text-red-200 disabled:opacity-60"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
          <button
            onClick={handleExportPdf}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex h-9 items-center gap-1.5 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            {saving ? (
              "Saving..."
            ) : (
              <>
                <Save className="h-3.5 w-3.5" />
                Save
              </>
            )}
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200" role="alert">
          <Check className="h-4 w-4" />
          {success}
        </div>
      )}

      {/* Mobile tab toggle */}
      <div className="lg:hidden" data-no-print>
        <SlidingTabs tabs={EDITOR_TABS} value={mobileTab} onChange={setMobileTab} size="sm" />
      </div>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor column */}
        <div
          className={cn(
            "space-y-4",
            mobileTab === "preview" && "hidden lg:block",
          )}
          data-no-print
        >
          {/* Metadata */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Report Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-white/70">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
                  placeholder="e.g. Q4 2025 LP Report"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-sm text-white/70">Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Type</label>
                  <select
                    value={reportType}
                    onChange={(e) => setReportType(e.target.value)}
                    className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="ad_hoc">Ad Hoc</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm text-white/70">Status</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Report Theme */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Report Theme
            </h3>
            <ThemeSelector value={themeId} onChange={setThemeId} />
          </div>

          {/* Investment Selection */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wider text-white/40">
                Investments ({selectedIds.size}/{investments.length})
              </h3>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-white/50 hover:text-white"
              >
                {selectedIds.size === investments.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {investments.length === 0 ? (
              <p className="text-sm text-white/40">No investments in this fund yet.</p>
            ) : (
              <div className="space-y-1">
                {investments.map((inv) => {
                  const checked = selectedIds.has(inv.id);
                  const moic =
                    inv.invested_amount > 0
                      ? ((inv.current_value + inv.realized_value) / inv.invested_amount).toFixed(2)
                      : "-";
                  return (
                    <label
                      key={inv.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                        checked
                          ? "bg-white/[0.04]"
                          : "hover:bg-white/[0.02]",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleInvestment(inv.id)}
                        className="h-4 w-4 rounded border-white/20 bg-black/30 text-white accent-white"
                      />
                      <div className="min-w-0 flex-1">
                        <span className="text-sm text-white/80">{inv.company_name}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs tabular-nums text-white/50">
                        <span>{formatCurrency(inv.invested_amount, fund.currency)}</span>
                        <span>{formatCurrency(inv.current_value, fund.currency)}</span>
                        <span className="w-12 text-right">{moic}x</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Performance KPIs */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Live Performance
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <MiniKPI label="TVPI" value={fmtMultiple(performance.tvpi)} />
              <MiniKPI label="DPI" value={fmtMultiple(performance.dpi)} />
              <MiniKPI label="RVPI" value={fmtMultiple(performance.rvpi)} />
              <MiniKPI label="IRR" value="-" />
              <MiniKPI label="MOIC" value={fmtMultiple(performance.moic)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-white/50">
              <span>Invested: {formatCurrency(performance.totalInvested, fund.currency)}</span>
              <span>Current: {formatCurrency(performance.totalCurrentValue, fund.currency)}</span>
            </div>
          </div>

          {/* Quarterly Summary - Rich Text */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Quarterly Summary
            </h3>
            <RichTextEditor
              content={quarterlySummary}
              onChange={setQuarterlySummary}
              placeholder="Write a summary for this report period..."
            />
          </div>
        </div>

        {/* Preview column */}
        <div
          className={cn(
            "lg:sticky lg:top-4 lg:self-start overflow-visible",
            mobileTab === "edit" && "hidden lg:block",
          )}
        >
          <p className="mb-2 hidden text-[11px] font-medium uppercase tracking-wider text-white/30 lg:block">
            PDF Preview
          </p>
          <div className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10">
            <ReportPreview
            ref={previewRef}
            fundName={fund.name}
            title={title || "Untitled Report"}
            reportDate={reportDate}
            reportType={reportType}
            currency={fund.currency}
            performance={performance}
            investments={previewInvestments}
            quarterlySummary={quarterlySummary}
            theme={getReportTheme(themeId).colors}
          />
          </div>
        </div>
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Report"
        message="This action cannot be undone. The report will be permanently deleted."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white/80">{value}</p>
    </div>
  );
}

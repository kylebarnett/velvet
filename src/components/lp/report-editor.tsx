"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, Download, Trash2, Check, Send, BarChart3, Loader2, ChevronDown, GripVertical, Eye, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

type CompanyMetricValue = {
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: string | number;
};

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
  companyMetricPageIds?: string[];
  companyMetrics?: Record<string, CompanyMetricValue[]>;
  metricQuarters?: Record<string, string[]>;
  metricOrder?: Record<string, string[]>;
};

type EditorTab = "edit" | "preview";

const EDITOR_TABS: TabItem<EditorTab>[] = [
  { value: "edit", label: "Edit" },
  { value: "preview", label: "Preview" },
];

/* ---------- Helpers ---------- */

function toDateInputValue(dateStr: string): string {
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

function setsEqual(a: Set<string>, b: Set<string>): boolean {
  if (a.size !== b.size) return false;
  for (const id of a) {
    if (!b.has(id)) return false;
  }
  return true;
}

/** Derive unique quarter labels (e.g. "Q1 2025") from metrics, sorted descending. */
function getAvailableQuarters(metrics: CompanyMetricValue[]): string[] {
  const labels = new Set<string>();
  for (const m of metrics) {
    const d = new Date(m.period_start + "T00:00:00");
    const q = Math.floor(d.getMonth() / 3) + 1;
    labels.add(`Q${q} ${d.getFullYear()}`);
  }
  return [...labels].sort((a, b) => {
    // Parse "Q1 2025" → sortable number
    const [qa, ya] = [Number(a[1]), Number(a.slice(3))];
    const [qb, yb] = [Number(b[1]), Number(b.slice(3))];
    return yb !== ya ? yb - ya : qb - qa;
  });
}

/** Extract unique metric names from a metrics array, preserving first-seen order. */
function getUniqueMetricNames(metrics: CompanyMetricValue[]): string[] {
  const seen = new Set<string>();
  const names: string[] = [];
  for (const m of metrics) {
    if (!seen.has(m.metric_name)) {
      seen.add(m.metric_name);
      names.push(m.metric_name);
    }
  }
  return names;
}

/** Filter metrics to only those matching any of the selected quarter labels. */
function filterMetricsByQuarters(metrics: CompanyMetricValue[], quarters: string[]): CompanyMetricValue[] {
  if (quarters.length === 0) return metrics;
  const set = new Set(quarters);
  return metrics.filter((m) => {
    const d = new Date(m.period_start + "T00:00:00");
    const q = Math.floor(d.getMonth() / 3) + 1;
    return set.has(`Q${q} ${d.getFullYear()}`);
  });
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

  // Per-company metrics state
  const [metricPageIds, setMetricPageIds] = useState<Set<string>>(() => {
    const saved = existingContent?.companyMetricPageIds;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return new Set(saved);
    }
    return new Set();
  });
  const [companyMetricsCache, setCompanyMetricsCache] = useState<Record<string, CompanyMetricValue[]>>(() => {
    const saved = existingContent?.companyMetrics;
    if (saved && typeof saved === "object") {
      return saved as Record<string, CompanyMetricValue[]>;
    }
    return {};
  });
  const [fetchingMetrics, setFetchingMetrics] = useState<Set<string>>(new Set());
  // Per-company selected quarters (companyId → quarter labels like ["Q4 2025", "Q3 2025"])
  const [metricQuarters, setMetricQuarters] = useState<Record<string, string[]>>(() => {
    const saved = (existingContent as ReportContent | null)?.metricQuarters;
    if (saved && typeof saved === "object") {
      return saved as Record<string, string[]>;
    }
    return {};
  });
  // Per-company metric display order (companyId → ordered metric names)
  const [metricOrder, setMetricOrder] = useState<Record<string, string[]>>(() => {
    const saved = (existingContent as ReportContent | null)?.metricOrder;
    if (saved && typeof saved === "object") {
      return saved as Record<string, string[]>;
    }
    return {};
  });

  // UI state
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Dirty tracking
  const [isDirty, setIsDirty] = useState(false);
  const initialRef = useRef({
    title: report.title,
    reportDate: toDateInputValue(report.report_date),
    reportType: report.report_type,
    quarterlySummary: existingContent?.quarterlySummary ?? "",
    themeId: (existingContent?.theme as ReportThemeId) ?? DEFAULT_THEME_ID,
    selectedIds: new Set(
      existingContent?.selectedInvestmentIds && Array.isArray(existingContent.selectedInvestmentIds) && existingContent.selectedInvestmentIds.length > 0
        ? existingContent.selectedInvestmentIds
        : investments.map((inv) => inv.id),
    ),
    metricPageIds: new Set(
      existingContent?.companyMetricPageIds && Array.isArray(existingContent.companyMetricPageIds)
        ? existingContent.companyMetricPageIds
        : [],
    ),
    metricQuarters: (existingContent as ReportContent | null)?.metricQuarters ?? {},
    metricOrder: (existingContent as ReportContent | null)?.metricOrder ?? {},
  });

  // Check dirty whenever form changes
  useEffect(() => {
    const init = initialRef.current;
    const quartersChanged = JSON.stringify(metricQuarters) !== JSON.stringify(init.metricQuarters);
    const orderChanged = JSON.stringify(metricOrder) !== JSON.stringify(init.metricOrder);
    const dirty =
      title !== init.title ||
      reportDate !== init.reportDate ||
      reportType !== init.reportType ||
      quarterlySummary !== init.quarterlySummary ||
      themeId !== init.themeId ||
      !setsEqual(selectedIds, init.selectedIds) ||
      !setsEqual(metricPageIds, init.metricPageIds) ||
      quartersChanged ||
      orderChanged;
    setIsDirty(dirty);
  }, [title, reportDate, reportType, quarterlySummary, themeId, selectedIds, metricPageIds, metricQuarters, metricOrder]);

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

  // Escape key closes preview modal
  useEffect(() => {
    if (!showPreviewModal) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPreviewModal(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreviewModal]);

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
      irr: null as number | null,
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

  // Toggle per-company metrics page
  const toggleMetricPage = useCallback(async (companyId: string) => {
    const wasEnabled = metricPageIds.has(companyId);
    setMetricPageIds((prev) => {
      const next = new Set(prev);
      if (next.has(companyId)) {
        next.delete(companyId);
        return next;
      }
      next.add(companyId);
      return next;
    });

    if (wasEnabled) return; // toggling off, no fetch needed

    // Fetch metrics if not cached
    if (!companyMetricsCache[companyId] && !fetchingMetrics.has(companyId)) {
      setFetchingMetrics((prev) => new Set(prev).add(companyId));
      try {
        const res = await fetch(`/api/investors/companies/${companyId}/metrics`);
        if (res.ok) {
          const json = await res.json();
          const metrics: CompanyMetricValue[] = (json.metrics ?? []).map(
            (m: { metric_name: string; period_type: string; period_start: string; period_end: string; value: string | number }) => ({
              metric_name: m.metric_name,
              period_type: m.period_type,
              period_start: m.period_start,
              period_end: m.period_end,
              value: m.value,
            }),
          );
          setCompanyMetricsCache((prev) => ({ ...prev, [companyId]: metrics }));
          // Default to last 4 quarters if no prior selection
          if (!metricQuarters[companyId]) {
            const available = getAvailableQuarters(metrics);
            setMetricQuarters((prev) => ({ ...prev, [companyId]: available.slice(0, 4) }));
          }
          // Seed default metric order if none saved
          if (!metricOrder[companyId]) {
            setMetricOrder((prev) => ({ ...prev, [companyId]: getUniqueMetricNames(metrics) }));
          }
        }
      } catch {
        // Silently fail — user can retry
      } finally {
        setFetchingMetrics((prev) => {
          const next = new Set(prev);
          next.delete(companyId);
          return next;
        });
      }
    } else if (companyMetricsCache[companyId]) {
      // Already cached — default quarters + order if missing
      if (!metricQuarters[companyId]) {
        const available = getAvailableQuarters(companyMetricsCache[companyId]);
        setMetricQuarters((prev) => ({ ...prev, [companyId]: available.slice(0, 4) }));
      }
      if (!metricOrder[companyId]) {
        setMetricOrder((prev) => ({ ...prev, [companyId]: getUniqueMetricNames(companyMetricsCache[companyId]) }));
      }
    }
  }, [companyMetricsCache, fetchingMetrics, metricPageIds, metricQuarters, metricOrder]);

  // Build content payload (shared by save + publish)
  function buildContentPayload(): Record<string, unknown> {
    return {
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
      companyMetricPageIds: [...metricPageIds],
      companyMetrics: Object.fromEntries(
        [...metricPageIds]
          .filter((id) => companyMetricsCache[id])
          .map((id) => {
            const quarters = metricQuarters[id];
            const filtered = quarters
              ? filterMetricsByQuarters(companyMetricsCache[id], quarters)
              : companyMetricsCache[id];
            return [id, filtered];
          }),
      ),
      metricQuarters,
      metricOrder,
      generatedAt: new Date().toISOString(),
    };
  }

  // Reset initial ref after successful save/publish/unpublish
  function resetInitialRef() {
    initialRef.current = {
      title: title.trim(),
      reportDate,
      reportType,
      quarterlySummary,
      themeId,
      selectedIds: new Set(selectedIds),
      metricPageIds: new Set(metricPageIds),
      metricQuarters: { ...metricQuarters },
      metricOrder: { ...metricOrder },
    };
    setIsDirty(false);
  }

  // Save (preserves current status)
  async function handleSave() {
    setSaving(true);
    setError(null);

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
            content: buildContentPayload(),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save report.");

      resetInitialRef();
      setSuccess("Report saved successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  // Publish
  async function handlePublish() {
    setPublishing(true);
    setError(null);
    setShowPublishConfirm(false);

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
            status: "published",
            content: buildContentPayload(),
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to publish report.");

      setStatus("published");
      resetInitialRef();
      setSuccess("Report published successfully.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setPublishing(false);
    }
  }

  // Unpublish
  async function handleUnpublish() {
    setPublishing(true);
    setError(null);
    setShowUnpublishConfirm(false);

    try {
      const res = await fetch(
        `/api/investors/funds/${fund.id}/reports/${report.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "draft",
          }),
        },
      );

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to unpublish report.");

      setStatus("draft");
      resetInitialRef();
      setSuccess("Report reverted to draft.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setPublishing(false);
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
    id: inv.company_id,
    company: inv.company_name,
    invested: inv.invested_amount,
    current: inv.current_value,
    realized: inv.realized_value,
  }));

  // Build company metrics map for preview (filtered by selected quarters, with order)
  const previewCompanyMetrics = useMemo(() => {
    const result: Record<string, {
      companyName: string;
      invested: number;
      current: number;
      realized: number;
      metrics: CompanyMetricValue[];
      metricOrder?: string[];
    }> = {};

    for (const inv of selectedInvestments) {
      if (metricPageIds.has(inv.company_id) && companyMetricsCache[inv.company_id]) {
        const allMetrics = companyMetricsCache[inv.company_id];
        const quarters = metricQuarters[inv.company_id];
        const filtered = quarters
          ? filterMetricsByQuarters(allMetrics, quarters)
          : allMetrics;
        result[inv.company_id] = {
          companyName: inv.company_name,
          invested: inv.invested_amount,
          current: inv.current_value,
          realized: inv.realized_value,
          metrics: filtered,
          metricOrder: metricOrder[inv.company_id],
        };
      }
    }

    return Object.keys(result).length > 0 ? result : undefined;
  }, [selectedInvestments, metricPageIds, companyMetricsCache, metricQuarters, metricOrder]);

  return (
    <div className="space-y-4">
      {/* Back link */}
      <button
        type="button"
        onClick={() => router.push(`/lp-reports/${fund.id}?tab=reports`)}
        className="flex items-center gap-1 text-xs text-white/40 hover:text-white"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {fund.name}
      </button>

      {/* Header bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title || "Untitled Report"}</h1>
          {status === "published" && (
            <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
              Published
            </span>
          )}
          {isDirty && (
            <span className="text-xs text-amber-300/80">Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2" data-no-print>
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </button>
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
          {status === "draft" ? (
            <button
              onClick={() => setShowPublishConfirm(true)}
              disabled={publishing}
              className="flex h-9 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              <Send className="h-3.5 w-3.5" />
              Publish
            </button>
          ) : (
            <button
              onClick={() => setShowUnpublishConfirm(true)}
              disabled={publishing}
              className="flex h-9 items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 text-sm font-medium text-amber-200 hover:bg-amber-500/20 disabled:opacity-60"
            >
              Unpublish
            </button>
          )}
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
              <div className="grid gap-3 sm:grid-cols-2">
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
                    className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
                  >
                    <option value="quarterly">Quarterly</option>
                    <option value="annual">Annual</option>
                    <option value="ad_hoc">Ad Hoc</option>
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
                  const hasMetricPage = metricPageIds.has(inv.company_id);
                  const isFetching = fetchingMetrics.has(inv.company_id);
                  const cachedMetrics = companyMetricsCache[inv.company_id];
                  return (
                    <div key={inv.id}>
                      <label
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
                      {checked && (
                        <div className="ml-10 mb-1 space-y-1.5">
                          <button
                            type="button"
                            onClick={() => toggleMetricPage(inv.company_id)}
                            disabled={isFetching}
                            className={cn(
                              "flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
                              hasMetricPage
                                ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                                : "border border-white/10 text-white/50 hover:bg-white/5 hover:text-white/70",
                            )}
                          >
                            {isFetching ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <BarChart3 className="h-3 w-3" />
                            )}
                            {hasMetricPage ? "Metrics included" : "Include metrics page"}
                            {hasMetricPage && cachedMetrics && (
                              <span className="ml-1 rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-medium">
                                {filterMetricsByQuarters(cachedMetrics, metricQuarters[inv.company_id] ?? []).length}
                              </span>
                            )}
                          </button>
                          {hasMetricPage && cachedMetrics && (
                            <>
                              <QuarterPicker
                                companyId={inv.company_id}
                                metrics={cachedMetrics}
                                selected={metricQuarters[inv.company_id] ?? []}
                                onChange={(quarters) =>
                                  setMetricQuarters((prev) => ({ ...prev, [inv.company_id]: quarters }))
                                }
                              />
                              <MetricOrderList
                                order={metricOrder[inv.company_id] ?? getUniqueMetricNames(cachedMetrics)}
                                onChange={(newOrder) =>
                                  setMetricOrder((prev) => ({ ...prev, [inv.company_id]: newOrder }))
                                }
                              />
                            </>
                          )}
                        </div>
                      )}
                    </div>
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
              companyMetrics={previewCompanyMetrics}
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

      {/* Publish confirmation modal */}
      <ConfirmModal
        open={showPublishConfirm}
        title="Publish Report"
        message="This will save all changes and mark the report as published. You can unpublish it later if needed."
        variant="default"
        confirmLabel="Publish"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishConfirm(false)}
      />

      {/* Unpublish confirmation modal */}
      <ConfirmModal
        open={showUnpublishConfirm}
        title="Unpublish Report"
        message="This will revert the report to draft status. It will no longer be visible as a published report."
        variant="warning"
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishConfirm(false)}
      />

      {/* Full-screen preview modal */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-sm">
          {/* Modal header */}
          <div className="flex items-center justify-between border-b border-white/10 bg-zinc-900 px-6 py-3">
            <h2 className="text-sm font-medium text-white/70">Report Preview</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPdf}
                className="flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 hover:text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </button>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white"
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {/* Scrollable preview body */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mx-auto max-w-[794px]">
              <ReportPreview
                fundName={fund.name}
                title={title || "Untitled Report"}
                reportDate={reportDate}
                reportType={reportType}
                currency={fund.currency}
                performance={performance}
                investments={previewInvestments}
                quarterlySummary={quarterlySummary}
                theme={getReportTheme(themeId).colors}
                companyMetrics={previewCompanyMetrics}
              />
            </div>
          </div>
        </div>
      )}
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

function QuarterPicker({
  companyId,
  metrics,
  selected,
  onChange,
}: {
  companyId: string;
  metrics: CompanyMetricValue[];
  selected: string[];
  onChange: (quarters: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = useMemo(() => getAvailableQuarters(metrics), [metrics]);
  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const toggle = useCallback(
    (q: string) => {
      const next = new Set(selectedSet);
      if (next.has(q)) {
        next.delete(q);
      } else {
        next.add(q);
      }
      onChange([...next]);
    },
    [selectedSet, onChange],
  );

  const selectRecent = useCallback(
    (n: number) => {
      onChange(available.slice(0, n));
    },
    [available, onChange],
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/70"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {selected.length === 0
          ? "All quarters"
          : `${selected.length} quarter${selected.length !== 1 ? "s" : ""} selected`}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-white/10 bg-black/40 p-2">
          <div className="mb-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectRecent(4)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                selected.length === 4 && setsEqual(new Set(selected), new Set(available.slice(0, 4)))
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70",
              )}
            >
              Last 4
            </button>
            <button
              type="button"
              onClick={() => selectRecent(8)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                selected.length === 8 && setsEqual(new Set(selected), new Set(available.slice(0, 8)))
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70",
              )}
            >
              Last 8
            </button>
            <button
              type="button"
              onClick={() => onChange([...available])}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                selected.length === available.length
                  ? "bg-white/15 text-white"
                  : "text-white/50 hover:bg-white/5 hover:text-white/70",
              )}
            >
              All
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {available.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => toggle(q)}
                className={cn(
                  "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                  selectedSet.has(q)
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white/70",
                )}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricOrderList({
  order,
  onChange,
}: {
  order: string[];
  onChange: (newOrder: string[]) => void;
}) {
  const [open, setOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (over && active.id !== over.id) {
        const oldIndex = order.indexOf(String(active.id));
        const newIndex = order.indexOf(String(over.id));
        onChange(arrayMove(order, oldIndex, newIndex));
      }
    },
    [order, onChange],
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white/70"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        Reorder metrics ({order.length})
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-white/10 bg-black/40 p-1.5">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={order} strategy={verticalListSortingStrategy}>
              {order.map((name) => (
                <SortableMetricItem key={name} name={name} />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}

function SortableMetricItem({ name }: { name: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: name });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-1.5 rounded px-1.5 py-1",
        isDragging && "bg-white/5",
      )}
    >
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-white/30 hover:bg-white/10 hover:text-white/50 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="text-[11px] text-white/70">{name}</span>
    </div>
  );
}

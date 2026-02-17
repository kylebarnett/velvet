"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Save, Download, Trash2, Send, BarChart3, Loader2, ChevronDown, GripVertical, Eye, X } from "lucide-react";
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

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/cn";

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

export function ReportEditor({ fund, report, investments }: ReportEditorProps) {
  const router = useRouter();
  const previewRef = useRef<HTMLDivElement>(null);

  const existingContent = report.content as ReportContent | null;

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

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const saved = existingContent?.selectedInvestmentIds;
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return new Set(saved);
    }
    return new Set(investments.map((inv) => inv.id));
  });

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
  const [metricQuarters, setMetricQuarters] = useState<Record<string, string[]>>(() => {
    const saved = (existingContent as ReportContent | null)?.metricQuarters;
    if (saved && typeof saved === "object") {
      return saved as Record<string, string[]>;
    }
    return {};
  });
  const [metricOrder, setMetricOrder] = useState<Record<string, string[]>>(() => {
    const saved = (existingContent as ReportContent | null)?.metricOrder;
    if (saved && typeof saved === "object") {
      return saved as Record<string, string[]>;
    }
    return {};
  });

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [mobileTab, setMobileTab] = useState<EditorTab>("edit");
  const [showPreviewModal, setShowPreviewModal] = useState(false);

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

  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!showPreviewModal) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setShowPreviewModal(false);
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [showPreviewModal]);

  const selectedInvestments = useMemo(
    () => investments.filter((inv) => selectedIds.has(inv.id)),
    [investments, selectedIds],
  );

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

  const buildContentPayload = useCallback((): Record<string, unknown> => {
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
  }, [quarterlySummary, selectedIds, themeId, performance, selectedInvestments, metricPageIds, companyMetricsCache, metricQuarters, metricOrder]);

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

  async function handleSave() {
    setSaving(true);

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
      router.push("/funds/lp-reports");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
      setSaving(false);
    }
  }

  async function handlePublish() {
    setPublishing(true);
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
      toast.success("Report published successfully.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleUnpublish() {
    setPublishing(true);
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
      toast.success("Report reverted to draft.");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setPublishing(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);

    try {
      const res = await fetch(
        `/api/investors/funds/${fund.id}/reports/${report.id}`,
        { method: "DELETE" },
      );

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json?.error ?? "Failed to delete report.");
      }

      router.push(`/funds/${fund.id}?tab=reports`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "An error occurred.");
      setDeleting(false);
    }
  }

  async function handleExportPdf() {
    if (!previewRef.current) return;
    try {
      const { exportElementAsPdf } = await import("@/lib/utils/export-pdf");
      const safeName = `${title.replace(/[^a-zA-Z0-9._-]/g, "_")}.pdf`;
      await exportElementAsPdf(previewRef.current, safeName);
    } catch {
      toast.error("Failed to export PDF.");
    }
  }

  const previewInvestments = useMemo(
    () =>
      selectedInvestments.map((inv) => ({
        id: inv.company_id,
        company: inv.company_name,
        invested: inv.invested_amount,
        current: inv.current_value,
        realized: inv.realized_value,
      })),
    [selectedInvestments],
  );

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

  const themeColors = useMemo(() => getReportTheme(themeId).colors, [themeId]);

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push(`/funds/${fund.id}?tab=reports`)}
        className="text-text-muted hover:text-text-primary"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {fund.name}
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold tracking-tight">{title || "Untitled Report"}</h1>
          {status === "published" && (
            <span className="rounded-full bg-[var(--success-bg-muted)] px-2 py-0.5 text-xs font-medium text-[var(--status-success-text)]">
              Published
            </span>
          )}
          {isDirty && (
            <span className="text-xs text-[var(--warning-accent)]">Unsaved changes</span>
          )}
        </div>
        <div className="flex items-center gap-2" data-no-print>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowPreviewModal(true)}
          >
            <Eye className="h-3.5 w-3.5" />
            Preview
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowDeleteConfirm(true)}
            disabled={deleting}
            className="text-[var(--status-error-text)] hover:bg-[var(--error-bg-subtle)] hover:text-[var(--status-error-text)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportPdf}
          >
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          {status === "draft" ? (
            <Button
              size="sm"
              onClick={() => setShowPublishConfirm(true)}
              disabled={publishing}
              className="bg-[var(--success-solid)] hover:bg-[var(--success-solid)]"
            >
              <Send className="h-3.5 w-3.5" />
              Publish
            </Button>
          ) : (
            <Button
              variant="warning"
              size="sm"
              onClick={() => setShowUnpublishConfirm(true)}
              disabled={publishing}
            >
              Unpublish
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleSave}
            loading={saving}
          >
            <Save className="h-3.5 w-3.5" />
            Save
          </Button>
        </div>
      </div>

      <div className="lg:hidden" data-no-print>
        <SlidingTabs tabs={EDITOR_TABS} value={mobileTab} onChange={setMobileTab} size="sm" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div
          className={cn(
            "space-y-4",
            mobileTab === "preview" && "hidden lg:block",
          )}
          data-no-print
        >
          <div className="rounded-xl border border-border-default card-surface p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Report Details
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm text-text-secondary">Title</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
                  placeholder="e.g. Q4 2025 LP Report"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm text-text-secondary">Date</label>
                  <input
                    type="date"
                    value={reportDate}
                    onChange={(e) => setReportDate(e.target.value)}
                    className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-text-secondary">Type</label>
                  <Select value={reportType} onValueChange={setReportType}>
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
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-border-default card-surface p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Report Theme
            </h3>
            <ThemeSelector value={themeId} onChange={setThemeId} />
          </div>

          <div className="rounded-xl border border-border-default card-surface p-4">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
                Investments ({selectedIds.size}/{investments.length})
              </h3>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-text-muted hover:text-text-primary"
              >
                {selectedIds.size === investments.length ? "Deselect All" : "Select All"}
              </button>
            </div>
            {investments.length === 0 ? (
              <p className="text-sm text-text-muted">No investments in this fund yet.</p>
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
                            ? "bg-bg-raised"
                            : "hover:bg-bg-raised",
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleInvestment(inv.id)}
                          className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-sm text-text-primary">{inv.company_name}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs tabular-nums text-text-muted">
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
                                ? "border border-[var(--success-border)] bg-[var(--success-bg-subtle)] text-[var(--status-success-text)]"
                                : "border border-border-default text-text-muted hover:bg-bg-hover hover:text-text-secondary",
                            )}
                          >
                            {isFetching ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <BarChart3 className="h-3 w-3" />
                            )}
                            {hasMetricPage ? "Metrics included" : "Include metrics page"}
                            {hasMetricPage && cachedMetrics && (
                              <span className="ml-1 rounded-full bg-[var(--success-bg-muted)] px-1.5 text-[10px] font-medium">
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

          <div className="rounded-xl border border-border-default card-surface p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Live Performance
            </h3>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              <MiniKPI label="TVPI" value={fmtMultiple(performance.tvpi)} />
              <MiniKPI label="DPI" value={fmtMultiple(performance.dpi)} />
              <MiniKPI label="RVPI" value={fmtMultiple(performance.rvpi)} />
              <MiniKPI label="IRR" value="-" />
              <MiniKPI label="MOIC" value={fmtMultiple(performance.moic)} />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-text-muted">
              <span>Invested: {formatCurrency(performance.totalInvested, fund.currency)}</span>
              <span>Current: {formatCurrency(performance.totalCurrentValue, fund.currency)}</span>
            </div>
          </div>

          <div className="rounded-xl border border-border-default card-surface p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-text-muted">
              Quarterly Summary
            </h3>
            <RichTextEditor
              content={quarterlySummary}
              onChange={setQuarterlySummary}
              placeholder="Write a summary for this report period..."
            />
          </div>
        </div>

        <div
          className={cn(
            "lg:sticky lg:top-4 lg:self-start overflow-visible",
            mobileTab === "edit" && "hidden lg:block",
          )}
        >
          <p className="mb-2 hidden text-[11px] font-medium uppercase tracking-wide text-text-faint lg:block">
            PDF Preview
          </p>
          <ScaledPreview>
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
              theme={themeColors}
              companyMetrics={previewCompanyMetrics}
            />
          </ScaledPreview>
        </div>
      </div>

      <ConfirmModal
        open={showDeleteConfirm}
        title="Delete Report"
        message="This action cannot be undone. The report will be permanently deleted."
        variant="danger"
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <ConfirmModal
        open={showPublishConfirm}
        title="Publish Report"
        message="This will save all changes and mark the report as published. You can unpublish it later if needed."
        variant="default"
        confirmLabel="Publish"
        onConfirm={handlePublish}
        onCancel={() => setShowPublishConfirm(false)}
      />

      <ConfirmModal
        open={showUnpublishConfirm}
        title="Unpublish Report"
        message="This will revert the report to draft status. It will no longer be visible as a published report."
        variant="warning"
        confirmLabel="Unpublish"
        onConfirm={handleUnpublish}
        onCancel={() => setShowUnpublishConfirm(false)}
      />

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex flex-col bg-bg-backdrop backdrop-blur-sm">
          <div className="flex items-center justify-between border-b border-border-default bg-bg-secondary px-6 py-3">
            <h2 className="text-sm font-medium text-text-secondary">Report Preview</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportPdf}
              >
                <Download className="h-3.5 w-3.5" />
                Export PDF
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowPreviewModal(false)}
                aria-label="Close preview"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
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
                theme={themeColors}
                companyMetrics={previewCompanyMetrics}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const PREVIEW_NATURAL_WIDTH = 794; // A4-ish width in px

function ScaledPreview({ children }: { children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState<number | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    function measure() {
      if (!containerRef.current || !innerRef.current) return;
      const containerWidth = containerRef.current.clientWidth;
      const newScale = Math.min(1, containerWidth / PREVIEW_NATURAL_WIDTH);
      setScale(newScale);
      setContentHeight(innerRef.current.scrollHeight);
    }

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(container);
    observer.observe(inner);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-lg shadow-lg ring-1 ring-black/10"
      style={{ height: contentHeight ? contentHeight * scale : "auto" }}
    >
      <div
        ref={innerRef}
        style={{
          width: PREVIEW_NATURAL_WIDTH,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        {children}
      </div>
    </div>
  );
}

function MiniKPI({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-raised px-2 py-1.5 text-center">
      <p className="text-[10px] uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
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
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        {selected.length === 0
          ? "All quarters"
          : `${selected.length} quarter${selected.length !== 1 ? "s" : ""} selected`}
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-border-default bg-bg-sidebar p-2">
          <div className="mb-2 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => selectRecent(4)}
              className={cn(
                "rounded px-2 py-0.5 text-[10px] font-medium transition-colors",
                selected.length === 4 && setsEqual(new Set(selected), new Set(available.slice(0, 4)))
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary",
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
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary",
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
                  ? "bg-bg-hover text-text-primary"
                  : "text-text-muted hover:bg-bg-elevated hover:text-text-secondary",
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
                    ? "bg-[var(--success-bg-muted)] text-[var(--status-success-text)] border border-[var(--success-border)]"
                    : "bg-bg-elevated text-text-muted border border-transparent hover:bg-bg-hover hover:text-text-secondary",
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
        className="flex items-center gap-1 text-[11px] text-text-muted hover:text-text-secondary"
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
        Reorder metrics ({order.length})
      </button>
      {open && (
        <div className="mt-1.5 rounded-lg border border-border-default bg-bg-sidebar p-1.5">
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
        isDragging && "bg-bg-elevated",
      )}
    >
      <button
        type="button"
        className="flex h-5 w-5 shrink-0 cursor-grab items-center justify-center rounded text-text-faint hover:bg-bg-hover hover:text-text-muted active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-3 w-3" />
      </button>
      <span className="text-[11px] text-text-secondary">{name}</span>
    </div>
  );
}

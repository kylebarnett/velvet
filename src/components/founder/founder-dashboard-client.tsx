"use client";

import * as React from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import {
  DashboardWidget,
  ViewSelector,
  PeriodSelector,
  DateRangeSelector,
  Widget,
  MetricValue,
  PeriodType,
  DashboardLayout,
  getWidgetColSpanClass,
} from "@/components/dashboard";
import { DateRange } from "@/components/dashboard/date-range-selector";
import { Download, Settings, Mail, TrendingDown, TrendingUp, Fuel, ChevronDown, FileSpreadsheet, FileDown, X } from "lucide-react";

const MetricDetailPanel = dynamic(
  () => import("@/components/metrics/metric-detail-panel").then(m => ({ default: m.MetricDetailPanel })),
  { ssr: false, loading: () => <div className="h-64 animate-pulse rounded-xl bg-white/5" /> }
);
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { EmailPasteModal } from "@/components/founder/email-paste-modal";
import { AddMetricModal } from "@/components/founder/add-metric-modal";
import { computeRunway, type RunwayMissing } from "@/lib/metrics/derived-metrics";
import { downloadExcel } from "@/lib/utils/excel-export";
import { logger } from "@/lib/logger";

type DashboardView = {
  id: string;
  name: string;
  is_default: boolean;
  layout: unknown;
};

type DashboardTemplate = {
  id: string;
  name: string;
  description: string | null;
  target_industry: string | null;
  layout: unknown;
  is_system: boolean;
};

type FounderDashboardClientProps = {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  metrics: MetricValue[];
  views: DashboardView[];
  templates: DashboardTemplate[];
};

/**
 * Ensures an "All Metrics" table exists and all tables show all metrics.
 * Used for saved views where we want to preserve user's layout positions.
 */
function ensureMetricsTable(widgets: Widget[]): Widget[] {
  const hasTable = widgets.some((w) => w.type === "table");

  // Ensure all existing tables show all metrics (preserve positions)
  const updatedWidgets = widgets.map((w) => {
    if (w.type === "table" && w.config && typeof w.config === "object") {
      return {
        ...w,
        config: {
          ...w.config,
          showAllMetrics: true,
        },
      };
    }
    return w;
  });

  if (hasTable) {
    return updatedWidgets;
  }

  // No table exists - add one below all existing widgets
  const maxY = widgets.reduce((max, w) => Math.max(max, w.y + w.h), 0);

  return [
    ...updatedWidgets,
    {
      id: "table-all",
      type: "table",
      x: 0,
      y: maxY,
      w: 12,
      h: 3,
      config: {
        metrics: [],
        periodType: "quarterly",
        title: "All Metrics",
        showAllMetrics: true,
      },
    },
  ];
}

/**
 * Reorders widgets for templates/defaults: cards at top, then table, then charts.
 * Only used for default layouts, NOT for saved views.
 */
function reorderWidgetsWithCardsFirst(widgets: Widget[]): Widget[] {
  const metricCards = widgets.filter((w) => w.type === "metric-card");
  const tableWidgets = widgets.filter((w) => w.type === "table");
  const otherWidgets = widgets.filter(
    (w) => w.type !== "table" && w.type !== "metric-card",
  );

  const topCards = metricCards.slice(0, 4).map((card, index) => ({
    ...card,
    x: index * 3,
    y: 0,
    w: 3,
    h: 1,
  }));

  const cardRowHeight = topCards.length > 0 ? 1 : 0;

  if (tableWidgets.length === 0) {
    tableWidgets.push({
      id: "table-all",
      type: "table",
      x: 0,
      y: cardRowHeight + 2,
      w: 12,
      h: 3,
      config: {
        metrics: [],
        periodType: "quarterly",
        title: "All Metrics",
        showAllMetrics: true,
      },
    });
  } else {
    tableWidgets.forEach((t) => {
      t.y = cardRowHeight + 2;
      t.h = 3;
      if (t.config && typeof t.config === "object") {
        (t.config as Record<string, unknown>).showAllMetrics = true;
        (t.config as Record<string, unknown>).title = "All Metrics";
      }
    });
  }

  const tableEndRow = cardRowHeight + 5;
  const repositionedOthers = otherWidgets.map((w) => ({
    ...w,
    y: w.y < tableEndRow ? tableEndRow : w.y,
  }));

  const remainingCards = metricCards.slice(4).map((card, index) => ({
    ...card,
    y: tableEndRow + Math.floor(index / 4),
    x: (index % 4) * 3,
    w: 3,
    h: 1,
  }));

  return [...topCards, ...repositionedOthers, ...tableWidgets, ...remainingCards];
}

function getDefaultLayout(
  industry: string | null,
  templates: DashboardTemplate[],
  availableMetricNames: string[],
): Widget[] {
  let widgets: Widget[] = [];

  const matchingTemplate = templates.find(
    (t) => t.target_industry === industry && t.is_system,
  );

  if (matchingTemplate?.layout) {
    const layout = matchingTemplate.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = layout;
    } else if (layout.widgets) {
      widgets = layout.widgets;
    }
  }

  if (widgets.length === 0) {
    const generalTemplate = templates.find(
      (t) => t.target_industry === null && t.is_system,
    );

    if (generalTemplate?.layout) {
      const layout = generalTemplate.layout as DashboardLayout | Widget[];
      if (Array.isArray(layout)) {
        widgets = layout;
      } else if (layout.widgets) {
        widgets = layout.widgets;
      }
    }
  }

  if (widgets.length === 0) {
    // Use first 4 available metrics or fallback names
    const preferred = [
      "Revenue",
      "Gross Margin",
      "Burn Rate",
      "Runway",
    ];
    const cardMetrics =
      availableMetricNames.length > 0
        ? preferred.filter((p) =>
            availableMetricNames.some(
              (m) => m.toLowerCase() === p.toLowerCase(),
            ),
          )
        : preferred;
    // Fill remaining from available metrics
    if (cardMetrics.length < 4) {
      for (const m of availableMetricNames) {
        if (
          cardMetrics.length >= 4 ||
          cardMetrics.some((c) => c.toLowerCase() === m.toLowerCase())
        )
          break;
        cardMetrics.push(m);
      }
    }

    widgets = [
      ...cardMetrics.slice(0, 4).map((metric, i) => ({
        id: `card-${i}`,
        type: "metric-card" as const,
        x: i * 3,
        y: 0,
        w: 3,
        h: 1,
        config: { metric, showTrend: true, title: metric },
      })),
      {
        id: "chart-1",
        type: "chart" as const,
        x: 0,
        y: 1,
        w: 12,
        h: 2,
        config: {
          chartType: "area" as const,
          metrics: cardMetrics.slice(0, 1),
          periodType: "quarterly" as const,
          showLegend: true,
          title: `${cardMetrics[0] ?? "Metrics"} Over Time`,
        },
      },
    ];
  }

  return reorderWidgetsWithCardsFirst(widgets);
}

function filterMetricsByDateRange(
  metrics: MetricValue[],
  dateRange: DateRange,
): MetricValue[] {
  if (dateRange === "all") return metrics;

  const now = new Date();
  let cutoffDate: Date;

  if (dateRange === "1y") {
    cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  } else if (dateRange === "2y") {
    cutoffDate = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());
  } else {
    return metrics;
  }

  return metrics.filter((m) => new Date(m.period_start) >= cutoffDate);
}

function ExportDropdown({ isExporting, onExport }: { isExporting: boolean; onExport: (format: "csv" | "excel") => void }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const options = [
    { format: "csv" as const, label: "CSV", icon: FileDown },
    { format: "excel" as const, label: "Excel (.xlsx)", icon: FileSpreadsheet },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isExporting}
        className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default disabled:opacity-50"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Download className="h-3.5 w-3.5" />
        {isExporting ? "Exporting..." : "Export"}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-1 w-44 overflow-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm" role="menu">
          <div>
            {options.map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.format}
                  type="button"
                  role="menuitem"
                  onClick={() => { onExport(opt.format); setOpen(false); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
                >
                  <Icon className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function getCurrentMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().split("T")[0],
    end: end.toISOString().split("T")[0],
  };
}

function RunwayCard({
  metrics,
  companyId,
  onSubmitted,
}: {
  metrics: MetricValue[];
  companyId: string;
  onSubmitted: () => void;
}) {
  const [hidden, setHidden] = React.useState(false);
  const [cashInput, setCashInput] = React.useState("");
  const [burnInput, setBurnInput] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (localStorage.getItem("postsig_runway_hidden") === "true") {
      setHidden(true);
    }
  }, []);

  function handleHide() {
    localStorage.setItem("postsig_runway_hidden", "true");
    setHidden(true);
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "runway_hidden", value: true }),
    }).catch(() => {});
  }

  function handleShow() {
    localStorage.removeItem("postsig_runway_hidden");
    setHidden(false);
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "runway_hidden", value: false }),
    }).catch(() => {});
  }

  if (hidden) {
    return (
      <button
        type="button"
        onClick={handleShow}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-secondary hover:bg-bg-hover transition-colors"
      >
        <Fuel className="h-3.5 w-3.5" />
        Show runway
      </button>
    );
  }

  const result = computeRunway(metrics);

  if ("missing" in result) {
    const { missing } = result as RunwayMissing;
    const needsCash = missing.includes("Cash Balance");
    const needsBurn = missing.includes("Burn Rate");

    async function handleSubmit(e: React.FormEvent) {
      e.preventDefault();
      setError(null);

      const submissions: {
        metricName: string;
        periodType: "monthly";
        periodStart: string;
        periodEnd: string;
        value: string;
        source: "manual";
      }[] = [];

      const { start, end } = getCurrentMonthRange();

      if (needsCash) {
        const val = cashInput.replace(/[,$\s]/g, "");
        if (!val || isNaN(Number(val))) {
          setError("Enter a valid number for Cash Balance.");
          return;
        }
        submissions.push({
          metricName: "Cash Balance",
          periodType: "monthly",
          periodStart: start,
          periodEnd: end,
          value: val,
          source: "manual",
        });
      }

      if (needsBurn) {
        const val = burnInput.replace(/[,$\s]/g, "");
        if (!val || isNaN(Number(val))) {
          setError("Enter a valid number for Burn Rate.");
          return;
        }
        submissions.push({
          metricName: "Burn Rate",
          periodType: "monthly",
          periodStart: start,
          periodEnd: end,
          value: val,
          source: "manual",
        });
      }

      setSubmitting(true);
      try {
        const res = await fetch("/api/metrics/submit-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ companyId, submissions }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => null);
          setError(data?.error ?? "Submission failed. Please try again.");
          return;
        }

        const data = await res.json();
        if (data.submitted > 0) {
          onSubmitted();
        } else {
          setError("No metrics were saved. Please try again.");
        }
      } catch {
        setError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    }

    return (
      <div className="rounded-xl border border-border-default card-surface p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-text-muted">
            <Fuel className="h-4 w-4" aria-hidden="true" />
            <span className="text-xs font-medium uppercase tracking-wide">Runway</span>
          </div>
          <button
            type="button"
            onClick={handleHide}
            className="rounded-md p-1 text-text-faint hover:text-text-secondary hover:bg-bg-hover transition-colors"
            aria-label="Hide runway card"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="mt-2 text-sm text-text-tertiary">
          Submit {missing.map((name, i) => (
            <React.Fragment key={name}>
              {i > 0 && " and "}
              <span className="font-medium text-text-secondary">{name}</span>
            </React.Fragment>
          ))} to see your runway estimate.
        </p>
        <form onSubmit={handleSubmit} className="mt-3 space-y-2">
          {needsCash && (
            <label className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-text-secondary">Cash Balance</span>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  placeholder="500,000"
                  className="h-9 w-full rounded-md border border-border-default bg-bg-input pl-6 pr-3 text-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
                />
              </div>
            </label>
          )}
          {needsBurn && (
            <label className="flex items-center gap-2">
              <span className="w-28 shrink-0 text-xs text-text-secondary">Burn Rate</span>
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={burnInput}
                  onChange={(e) => setBurnInput(e.target.value)}
                  placeholder="50,000"
                  className="h-9 w-full rounded-md border border-border-default bg-bg-input pl-6 pr-10 text-sm text-text-primary placeholder:text-text-muted focus:border-border-active focus:outline-none"
                />
                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted">/mo</span>
              </div>
            </label>
          )}
          {error && (
            <p className="text-xs text-[var(--error-accent)]" role="alert">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="mt-1 inline-flex h-8 items-center rounded-md bg-btn-primary-bg px-3 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </form>
      </div>
    );
  }

  const runway = result;

  const colorMap = {
    critical: {
      bg: "bg-[var(--error-bg-subtle)] border-[var(--error-border)]",
      text: "text-[var(--error-accent)]",
      label: "Critical",
      icon: TrendingDown,
    },
    warning: {
      bg: "bg-[var(--warning-bg-subtle)] border-[var(--warning-border)]",
      text: "text-[var(--warning-accent)]",
      label: "Caution",
      icon: TrendingDown,
    },
    healthy: {
      bg: "bg-[var(--success-bg-subtle)] border-[var(--success-border)]",
      text: "text-[var(--success-accent)]",
      label: "Healthy",
      icon: TrendingUp,
    },
  };

  const style = colorMap[runway.urgency];
  const StatusIcon = style.icon;

  const formatCurrency = (n: number) => {
    if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
    return `$${n.toFixed(0)}`;
  };

  return (
    <div className={`rounded-xl border p-4 ${style.bg}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-text-muted">
          <Fuel className="h-4 w-4" aria-hidden="true" />
          <span className="text-xs font-medium uppercase tracking-wide">Runway</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${style.text}`}>
            <StatusIcon className="h-3 w-3" aria-hidden="true" />
            {style.label}
          </span>
          <button
            type="button"
            onClick={handleHide}
            className="rounded-md p-1 text-text-faint hover:text-text-secondary hover:bg-bg-hover transition-colors"
            aria-label="Hide runway card"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${style.text}`}>
          {runway.months.toFixed(1)}
        </span>
        <span className="text-sm text-text-tertiary">months</span>
      </div>
      <div className="mt-2 flex items-center gap-3 text-xs text-text-muted">
        <span>Cash: {formatCurrency(runway.cashBalance)}</span>
        <span>Burn: {formatCurrency(runway.burnRate)}/mo</span>
      </div>
    </div>
  );
}

export function FounderDashboardClient({
  companyId,
  companyName,
  companyIndustry,
  metrics,
  views: initialViews,
  templates,
}: FounderDashboardClientProps) {
  const router = useRouter();
  const [views, setViews] = React.useState(initialViews);
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    initialViews.find((v) => v.is_default)?.id ??
      initialViews[0]?.id ??
      null,
  );
  const { periodType, setPeriodType, dateRange, setDateRange } = useDashboardPreferences();
  const [isExporting, setIsExporting] = React.useState(false);
  const [detailSelection, setDetailSelection] = React.useState<{
    metricName: string;
    periodStart?: string;
    periodType?: string;
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = React.useState(false);
  const [showAddMetricModal, setShowAddMetricModal] = React.useState(false);

  // Sync views state when props change (e.g., after navigation with fresh server data)
  React.useEffect(() => {
    setViews(initialViews);
  }, [initialViews]);

  // Build list of available metric names
  const availableMetricNames = React.useMemo(() => {
    const names = new Set<string>();
    for (const m of metrics) {
      names.add(m.metric_name);
    }
    return Array.from(names).sort();
  }, [metrics]);

  async function handleDeleteView(viewId: string) {
    try {
      const res = await fetch(`/api/founder/dashboard-views/${viewId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete view");
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      if (viewId === selectedViewId) {
        const remaining = views.filter((v) => v.id !== viewId);
        setSelectedViewId(remaining[0]?.id ?? null);
      }
      router.refresh();
    } catch (err: unknown) {
      logger.error("Failed to delete view:", err);
    }
  }

  async function handleExport(format: "csv" | "excel" = "csv") {
    setIsExporting(true);
    try {
      if (format === "excel") {
        // Build Excel from metrics data
        const metricNames = [...new Set(metrics.map((m) => m.metric_name))].sort();
        const periods = [...new Set(metrics.map((m) => m.period_start))].sort();
        const headers = ["Metric", ...periods];
        const rows = metricNames.map((name) => {
          const row: (string | number | null)[] = [name];
          for (const period of periods) {
            const val = metrics.find((m) => m.metric_name === name && m.period_start === period);
            const raw = val?.value;
            if (raw && typeof raw === "object" && "raw" in raw) {
              row.push(String(raw.raw));
            } else if (raw !== undefined && raw !== null) {
              row.push(String(raw));
            } else {
              row.push(null);
            }
          }
          return row;
        });
        void downloadExcel({
          filename: `${companyName.replace(/[^a-z0-9]/gi, "_")}_metrics`,
          headers,
          rows,
          sheetName: "Metrics",
        });
        return;
      }

      // CSV export via server
      const params = new URLSearchParams();
      if (periodType) params.set("periodType", periodType);

      const response = await fetch(
        `/api/founder/metrics/export?${params.toString()}`,
      );
      if (!response.ok) throw new Error("Export failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${companyName.replace(/[^a-z0-9]/gi, "_")}_metrics.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      logger.error("Export error:", err);
    } finally {
      setIsExporting(false);
    }
  }

  // Get the current layout
  const currentView = views.find((v) => v.id === selectedViewId);
  let widgets: Widget[];

  if (currentView?.layout) {
    // Saved views: preserve positions but ensure metrics table exists
    const layout = currentView.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = ensureMetricsTable(layout);
    } else if (layout.widgets) {
      widgets = ensureMetricsTable(layout.widgets);
    } else {
      // No valid layout in saved view, fall back to default
      widgets = getDefaultLayout(companyIndustry, templates, availableMetricNames);
    }
  } else {
    // No saved view selected, use default layout (with reordering for templates)
    widgets = getDefaultLayout(companyIndustry, templates, availableMetricNames);
  }

  // Inline cell edit handler — posts to the single-metric submit API
  const handleValueSubmit = React.useCallback(
    async (metricName: string, periodStart: string, periodEnd: string, periodType: string, value: string): Promise<boolean> => {
      try {
        const res = await fetch("/api/metrics/submit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            companyId,
            metricName,
            periodType,
            periodStart,
            periodEnd,
            value,
            source: "override",
          }),
        });
        if (!res.ok) return false;
        router.refresh();
        return true;
      } catch {
        return false;
      }
    },
    [companyId, router],
  );

  const filteredMetrics = filterMetricsByDateRange(metrics, dateRange);

  return (
    <div className="space-y-4">
      {/* Runway indicator */}
      <div data-no-print>
        <RunwayCard metrics={metrics} companyId={companyId} onSubmitted={() => router.refresh()} />
      </div>

      {/* Controls bar */}
      <div data-no-print className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <ViewSelector
            views={views.map((v) => ({
              id: v.id,
              name: v.name,
              isDefault: v.is_default,
            }))}
            selectedViewId={selectedViewId}
            onChange={setSelectedViewId}
            onDelete={handleDeleteView}
          />
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowEmailModal(true)}
            className="flex items-center gap-1.5 rounded-lg border border-border-default bg-bg-elevated px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-bg-hover"
          >
            <Mail className="h-3 w-3" />
            Import from Email
          </button>
          <Link
            href="/portal/dashboard/edit"
            className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default"
          >
            <Settings className="h-3.5 w-3.5" />
            Edit Dashboard
          </Link>
        </div>
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        {/* Sort widgets by y position (row), then x position (column) */}
        {[...widgets]
          .sort((a, b) => a.y - b.y || a.x - b.x)
          .map((widget) => {
          const colSpanClass = getWidgetColSpanClass(widget.w);

          return (
            <div
              key={widget.id}
              className={`rounded-xl border border-border-default card-surface p-3 sm:p-4 ${colSpanClass}`}
              style={{ minHeight: `${widget.h * 100}px` } as React.CSSProperties}
            >
              <DashboardWidget
                widget={widget}
                metrics={filteredMetrics}
                periodTypeOverride={periodType}
                onMetricClick={(name, period) =>
                  setDetailSelection({ metricName: name, periodStart: period, periodType })
                }
                companyId={companyId}
                onAddMetric={() => setShowAddMetricModal(true)}
                editable
                onValueSubmit={handleValueSubmit}
                headerActions={
                  widget.type === "table" ? (
                    <ExportDropdown isExporting={isExporting} onExport={handleExport} />
                  ) : undefined
                }
              />
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-text-secondary">No widgets configured. Click &ldquo;Edit Dashboard&rdquo; to add charts and metrics.</p>
        </div>
      )}

      {detailSelection && (
        <MetricDetailPanel
          companyId={companyId}
          metricName={detailSelection.metricName}
          initialPeriod={detailSelection.periodStart}
          periodType={detailSelection.periodType}
          onClose={() => setDetailSelection(null)}
          editable
          onValueUpdated={() => router.refresh()}
        />
      )}

      <EmailPasteModal
        open={showEmailModal}
        companyId={companyId}
        onClose={() => setShowEmailModal(false)}
        onMetricsSaved={() => router.refresh()}
      />

      <AddMetricModal
        open={showAddMetricModal}
        companyId={companyId}
        existingMetricNames={availableMetricNames}
        onClose={() => setShowAddMetricModal(false)}
        onSubmitted={() => router.refresh()}
      />
    </div>
  );
}

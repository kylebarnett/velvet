"use client";

import * as React from "react";
import Link from "next/link";
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
} from "@/components/dashboard";
import { DateRange } from "@/components/dashboard/date-range-selector";
import { Download, Settings, Mail, BarChart3, Clock, FileUp } from "lucide-react";
import { MetricDetailPanel } from "@/components/metrics/metric-detail-panel";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { EmailPasteModal } from "@/components/founder/email-paste-modal";
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

type PendingRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
};

function EmptyMetricsState({
  companyId,
  onImportEmail,
}: {
  companyId: string;
  onImportEmail: () => void;
}) {
  const [pendingRequests, setPendingRequests] = React.useState<PendingRequest[]>([]);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/metric-requests");
        if (res.ok) {
          const data = await res.json();
          const pending = (data.requests ?? [])
            .filter((r: { status: string }) => r.status === "pending")
            .slice(0, 5);
          setPendingRequests(pending);
        }
      } catch {
        // Non-fatal
      } finally {
        setLoaded(true);
      }
    }
    load();
  }, []);

  if (!loaded) return null;

  if (pendingRequests.length > 0) {
    return (
      <div className="rounded-xl border border-border-default card-surface p-6">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--tag-blue-bg)]">
            <BarChart3 className="h-6 w-6 text-[var(--tag-blue-text)]" />
          </div>
          <h3 className="mt-4 text-base font-medium">Welcome to your metrics dashboard</h3>
          <p className="mt-1 text-sm text-text-tertiary">Your investors have requested the following metrics:</p>
        </div>
        <div className="mt-4 space-y-2">
          {pendingRequests.map((req, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg bg-bg-input px-3 py-2">
              <div className="flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-[var(--tag-amber-text)]" />
                <span className="text-sm text-text-primary">{req.metricName}</span>
              </div>
              {req.dueDate && (
                <span className="text-xs text-text-muted">
                  Due {new Date(req.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/portal/requests"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
          >
            Submit Metrics
          </Link>
          <button
            type="button"
            onClick={onImportEmail}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-4 text-sm font-medium text-text-secondary hover:bg-bg-hover"
          >
            <Mail className="h-4 w-4" />
            Import from Email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default card-surface p-6">
      <div className="flex flex-col items-center text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated">
          <Clock className="h-6 w-6 text-text-muted" />
        </div>
        <h3 className="mt-4 text-base font-medium">No metric requests yet</h3>
        <p className="mt-1 text-sm text-text-tertiary">
          When your investors request metrics, they&apos;ll appear here.
          You can also submit metrics proactively:
        </p>
      </div>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/portal/requests"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-4 text-sm font-medium text-text-secondary hover:bg-bg-hover"
        >
          <FileUp className="h-4 w-4" />
          Add Metrics Manually
        </Link>
        <button
          type="button"
          onClick={onImportEmail}
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-border-default bg-bg-elevated px-4 text-sm font-medium text-text-secondary hover:bg-bg-hover"
        >
          <Mail className="h-4 w-4" />
          Import from Email
        </button>
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
  } | null>(null);
  const [showEmailModal, setShowEmailModal] = React.useState(false);

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

  async function handleExport() {
    setIsExporting(true);
    try {
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

  const filteredMetrics = filterMetricsByDateRange(metrics, dateRange);
  const hasMetrics = metrics.length > 0;

  if (!hasMetrics) {
    return (
      <>
        <EmptyMetricsState
          companyId={companyId}
          onImportEmail={() => setShowEmailModal(true)}
        />
        <EmailPasteModal
          open={showEmailModal}
          companyId={companyId}
          onClose={() => setShowEmailModal(false)}
          onMetricsSaved={() => router.refresh()}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:gap-4">
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
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-input px-3 py-1.5 text-xs font-medium text-text-primary hover:border-border-default disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            {isExporting ? "Exporting..." : "Export CSV"}
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
          const colSpanClass =
            widget.w <= 4
              ? "sm:col-span-4 md:col-span-4 lg:col-span-4"
              : widget.w <= 6
                ? "sm:col-span-6 md:col-span-6 lg:col-span-6"
                : "sm:col-span-12";

          return (
            <div
              key={widget.id}
              className={`rounded-xl border border-border-default card-surface p-3 sm:p-4 ${colSpanClass}`}
              style={{ minHeight: `${widget.h * 80}px` } as React.CSSProperties}
            >
              <DashboardWidget
                widget={widget}
                metrics={filteredMetrics}
                periodTypeOverride={periodType}
                onMetricClick={(name, period) =>
                  setDetailSelection({ metricName: name, periodStart: period })
                }
                companyId={companyId}
              />
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className="rounded-xl border border-border-default card-surface p-6 text-center">
          <p className="text-text-tertiary">No widgets configured for this dashboard.</p>
          <p className="mt-2 text-sm text-text-muted">
            Click &quot;Edit Dashboard&quot; to add charts and metrics.
          </p>
        </div>
      )}

      {detailSelection && (
        <MetricDetailPanel
          companyId={companyId}
          metricName={detailSelection.metricName}
          initialPeriod={detailSelection.periodStart}
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
    </div>
  );
}

"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings, Send } from "lucide-react";
import { toast } from "sonner";
import {
  DashboardWidget,
  ViewSelector,
  PeriodSelector,
  DateRangeSelector,
  ExportButton,
  Widget,
  MetricValue,
  PeriodType,
  DashboardLayout,
  ensureMetricsTable,
} from "@/components/dashboard";
import { DateRange } from "@/components/dashboard/date-range-selector";
import { CompanyDocumentsTab } from "@/components/investor/company-documents-tab";
import { CompanyTearSheetsTab } from "@/components/investor/company-tear-sheets-tab";
import { MetricDetailPanel } from "@/components/metrics/metric-detail-panel";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";
import { logActivity } from "@/lib/activity/log-activity";
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

type CompanyDashboardClientProps = {
  companyId: string;
  companyName: string;
  companyIndustry: string | null;
  metrics: MetricValue[];
  views: DashboardView[];
  templates: DashboardTemplate[];
  readOnly?: boolean;
};

type TabValue = "metrics" | "documents" | "tear-sheets";

// Reorder widgets: 3 metric cards at top, then table, then other widgets
function reorderWidgetsWithCardsFirst(widgets: Widget[]): Widget[] {
  const metricCards = widgets.filter((w) => w.type === "metric-card");
  const tableWidgets = widgets.filter((w) => w.type === "table");
  const otherWidgets = widgets.filter((w) => w.type !== "table" && w.type !== "metric-card");

  // Ensure we have 3 metric cards at the top (4 columns each = 12 total)
  const topCards = metricCards.slice(0, 3).map((card, index) => ({
    ...card,
    x: index * 4,
    y: 0,
    w: 4,
    h: 1,
  }));

  // If we don't have 3 cards, that's fine - use what we have

  // Position table below cards (row 1)
  const cardRowHeight = topCards.length > 0 ? 1 : 0;

  // If no table exists, create one
  if (tableWidgets.length === 0) {
    tableWidgets.push({
      id: "table-all",
      type: "table",
      x: 0,
      y: cardRowHeight,
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
    // Position existing table below cards
    tableWidgets.forEach((t) => {
      t.y = cardRowHeight;
      t.h = 3;
      if (t.config && typeof t.config === "object") {
        (t.config as Record<string, unknown>).showAllMetrics = true;
        (t.config as Record<string, unknown>).title = "All Metrics";
      }
    });
  }

  // Reposition other widgets below the table
  const tableEndRow = cardRowHeight + 3;
  const repositionedOthers = otherWidgets.map((w) => ({
    ...w,
    y: w.y < tableEndRow ? tableEndRow : w.y,
  }));

  // Any remaining metric cards go after the table
  const remainingCards = metricCards.slice(3).map((card, index) => ({
    ...card,
    y: tableEndRow + Math.floor(index / 3),
    x: (index % 3) * 4,
    w: 4,
    h: 1,
  }));

  return [...topCards, ...tableWidgets, ...repositionedOthers, ...remainingCards];
}

// Default layout when no views exist
function getDefaultLayout(industry: string | null, templates: DashboardTemplate[]): Widget[] {
  let widgets: Widget[] = [];

  // Try to find a matching template for the industry
  const matchingTemplate = templates.find(
    (t) => t.target_industry === industry && t.is_system
  );

  if (matchingTemplate?.layout) {
    const layout = matchingTemplate.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = layout;
    } else if (layout.widgets) {
      widgets = layout.widgets;
    }
  }

  // Fall back to general financial template
  if (widgets.length === 0) {
    const generalTemplate = templates.find(
      (t) => t.target_industry === null && t.is_system
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

  // Hardcoded fallback if no templates found
  if (widgets.length === 0) {
    widgets = [
      {
        id: "card-1",
        type: "metric-card",
        x: 0,
        y: 0,
        w: 3,
        h: 1,
        config: { metric: "Revenue", showTrend: true, title: "Revenue" },
      },
      {
        id: "card-2",
        type: "metric-card",
        x: 3,
        y: 0,
        w: 3,
        h: 1,
        config: { metric: "Gross Margin", showTrend: true, title: "Gross Margin" },
      },
      {
        id: "card-3",
        type: "metric-card",
        x: 6,
        y: 0,
        w: 3,
        h: 1,
        config: { metric: "Burn Rate", showTrend: true, title: "Burn Rate" },
      },
      {
        id: "card-4",
        type: "metric-card",
        x: 9,
        y: 0,
        w: 3,
        h: 1,
        config: { metric: "Runway", showTrend: true, title: "Runway" },
      },
      {
        id: "chart-1",
        type: "chart",
        x: 0,
        y: 1,
        w: 12,
        h: 2,
        config: {
          chartType: "area",
          metrics: ["Revenue"],
          periodType: "quarterly",
          showLegend: true,
          title: "Revenue Over Time",
        },
      },
    ] as Widget[];
  }

  // Always reorder to put table first with all metrics
  return reorderWidgetsWithCardsFirst(widgets);
}

function filterMetricsByDateRange(
  metrics: MetricValue[],
  dateRange: DateRange
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

  return metrics.filter(
    (m) => new Date(m.period_start) >= cutoffDate
  );
}

function MetricsTabContent({
  companyId,
  companyName,
  companyIndustry,
  metrics,
  views: initialViews,
  templates,
  readOnly,
}: CompanyDashboardClientProps) {
  const router = useRouter();
  const [views, setViews] = React.useState(initialViews);
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    initialViews.find((v) => v.is_default)?.id ?? initialViews[0]?.id ?? null
  );
  const { periodType, setPeriodType, dateRange, setDateRange, resetPeriodType } = useDashboardPreferences();

  // Reset to quarterly when switching between companies
  React.useEffect(() => {
    resetPeriodType();
  }, [companyId, resetPeriodType]);

  const [detailSelection, setDetailSelection] = React.useState<{
    metricName: string;
    periodStart?: string;
    periodType?: string;
  } | null>(null);

  /** Inline add metric handler — POSTs to investor metrics endpoint */
  const handleInlineMetricSave = React.useCallback(
    async (
      metricName: string,
      values: { periodStart: string; value: string }[],
    ): Promise<boolean> => {
      // Map period type from display format ("yearly") to DB format ("annual")
      const dbPeriodType =
        periodType === "yearly" ? "annual" : periodType;

      const metricsPayload = values.map((v) => ({
        metric_name: metricName,
        value: v.value,
        period_type: dbPeriodType,
        period_start: v.periodStart,
      }));

      try {
        const res = await fetch(
          `/api/investors/companies/${companyId}/metrics`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ metrics: metricsPayload }),
          },
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to save metrics.");
        }
        toast.success(
          `${json.count} metric value${json.count === 1 ? "" : "s"} saved.`,
        );
        router.refresh();
        return true;
      } catch (err: unknown) {
        toast.error(
          err instanceof Error ? err.message : "Something went wrong.",
        );
        return false;
      }
    },
    [companyId, periodType, router],
  );

  async function handleDeleteView(viewId: string) {
    try {
      const res = await fetch(`/api/investors/dashboard-views/${viewId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        throw new Error("Failed to delete view");
      }
      // Remove from local state
      setViews((prev) => prev.filter((v) => v.id !== viewId));
      // If we deleted the selected view, switch to another
      if (viewId === selectedViewId) {
        const remaining = views.filter((v) => v.id !== viewId);
        setSelectedViewId(remaining[0]?.id ?? null);
      }
      router.refresh();
    } catch (err: unknown) {
      logger.error("Failed to delete view:", err);
    }
  }

  // Get the current layout
  const currentView = views.find((v) => v.id === selectedViewId);
  let widgets: Widget[];

  if (currentView?.layout) {
    // Saved views: preserve user's custom positions, only ensure a table exists
    const layout = currentView.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = ensureMetricsTable(layout);
    } else if (layout.widgets) {
      widgets = ensureMetricsTable(layout.widgets);
    } else {
      widgets = getDefaultLayout(companyIndustry, templates);
    }
  } else {
    widgets = getDefaultLayout(companyIndustry, templates);
  }

  // Sort by grid position (y then x) so CSS grid renders in spatial order
  widgets = [...widgets].sort((a, b) => a.y - b.y || a.x - b.x);

  // Filter metrics by date range
  const filteredMetrics = filterMetricsByDateRange(metrics, dateRange);

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
          <div className="hidden sm:block h-5 w-px bg-bg-elevated" />
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <div className="hidden sm:block h-5 w-px bg-bg-elevated" />
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
        {!readOnly && (
          <div className="flex items-center gap-2">
            <Link
              href={`/metric-requests/new?companyId=${companyId}`}
              className="flex items-center justify-center gap-2 rounded-lg bg-btn-primary-bg px-3 py-2 sm:py-1.5 text-xs font-medium text-btn-primary-text hover:bg-btn-primary-hover transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Request Metrics</span>
            </Link>
            <Link
              href={`/companies/${companyId}/edit`}
              className="flex items-center justify-center gap-2 rounded-lg border border-border-subtle bg-bg-raised px-3 py-2 sm:py-1.5 text-xs font-medium text-text-tertiary hover:border-border-default hover:text-text-secondary transition-colors"
            >
              <Settings className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Edit Dashboard</span>
            </Link>
          </div>
        )}
      </div>

      {/* Dashboard grid - stacked on mobile, grid on desktop */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-12">
        {widgets.map((widget) => {
          // Calculate responsive column span
          const colSpanClass = widget.w <= 4
            ? "sm:col-span-4 md:col-span-4 lg:col-span-4"
            : widget.w <= 6
              ? "sm:col-span-6 md:col-span-6 lg:col-span-6"
              : "sm:col-span-12";

          return (
            <div
              key={widget.id}
              className={`rounded-xl border border-border-subtle bg-bg-raised p-3 sm:p-4 ${colSpanClass}`}
              style={{
                minHeight: `${widget.h * 80}px`,
              } as React.CSSProperties}
            >
              <DashboardWidget
                widget={widget}
                metrics={filteredMetrics}
                periodTypeOverride={periodType}
                companyId={companyId}
                onMetricClick={(name, period) =>
                  setDetailSelection({ metricName: name, periodStart: period, periodType })
                }
                onAddMetricInline={
                  widget.type === "table" && !readOnly
                    ? handleInlineMetricSave
                    : undefined
                }
                headerActions={
                  widget.type === "table" && !readOnly ? (
                    <ExportButton companyId={companyId} companyName={companyName} periodType={periodType} />
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
        />
      )}
    </div>
  );
}

export function CompanyDashboardClient(props: CompanyDashboardClientProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabValue) || "metrics";

  // Log view_dashboard once per company visit
  const loggedRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (loggedRef.current !== props.companyId) {
      loggedRef.current = props.companyId;
      logActivity({ companyId: props.companyId, action: "view_dashboard" });
    }
  }, [props.companyId]);

  return (
    <>
      {activeTab === "metrics" && <MetricsTabContent {...props} />}
      {activeTab === "documents" && (
        <CompanyDocumentsTab
          companyId={props.companyId}
          companyName={props.companyName}
        />
      )}
      {activeTab === "tear-sheets" && (
        <CompanyTearSheetsTab
          companyId={props.companyId}
          companyName={props.companyName}
        />
      )}
    </>
  );
}

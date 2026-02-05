"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Settings } from "lucide-react";
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
} from "@/components/dashboard";
import { DateRange } from "@/components/dashboard/date-range-selector";
import { CompanyDocumentsTab } from "@/components/investor/company-documents-tab";
import { CompanyTearSheetsTab } from "@/components/investor/company-tear-sheets-tab";
import { useDashboardPreferences } from "@/hooks/use-dashboard-preferences";

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
}: CompanyDashboardClientProps) {
  const router = useRouter();
  const [views, setViews] = React.useState(initialViews);
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    initialViews.find((v) => v.is_default)?.id ?? initialViews[0]?.id ?? null
  );
  const { periodType, setPeriodType, dateRange, setDateRange } = useDashboardPreferences();

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
    } catch (err) {
      console.error("Failed to delete view:", err);
    }
  }

  // Get the current layout
  const currentView = views.find((v) => v.id === selectedViewId);
  let widgets: Widget[];

  if (currentView?.layout) {
    const layout = currentView.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = reorderWidgetsWithCardsFirst(layout);
    } else if (layout.widgets) {
      widgets = reorderWidgetsWithCardsFirst(layout.widgets);
    } else {
      widgets = getDefaultLayout(companyIndustry, templates);
    }
  } else {
    widgets = getDefaultLayout(companyIndustry, templates);
  }

  // Filter metrics by date range
  const filteredMetrics = filterMetricsByDateRange(metrics, dateRange);

  // Check if we have any metrics
  const hasMetrics = metrics.length > 0;

  if (!hasMetrics) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-white/60">No metrics have been submitted for this company yet.</p>
        <p className="mt-2 text-sm text-white/40">
          Metrics will appear here once the founder submits data.
        </p>
      </div>
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
          <Link
            href={`/dashboard/${companyId}/edit`}
            className="flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2 sm:py-1.5 text-xs font-medium text-white/80 hover:border-white/20"
          >
            <Settings className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Edit Dashboard</span>
          </Link>
          <ExportButton
            companyId={companyId}
            companyName={companyName}
            periodType={periodType}
          />
        </div>
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
              className={`rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 ${colSpanClass}`}
              style={{
                minHeight: `${widget.h * 80}px`,
              }}
            >
              <DashboardWidget
                widget={widget}
                metrics={filteredMetrics}
                periodTypeOverride={periodType}
                companyId={companyId}
              />
            </div>
          );
        })}
      </div>

      {widgets.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No widgets configured for this dashboard.</p>
          <p className="mt-2 text-sm text-white/40">
            Click "Edit Dashboard" to add charts and metrics.
          </p>
        </div>
      )}
    </div>
  );
}

export function CompanyDashboardClient(props: CompanyDashboardClientProps) {
  const searchParams = useSearchParams();
  const activeTab = (searchParams.get("tab") as TabValue) || "metrics";

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

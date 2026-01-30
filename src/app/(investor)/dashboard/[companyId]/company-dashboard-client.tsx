"use client";

import * as React from "react";
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

// Default layout when no views exist
function getDefaultLayout(industry: string | null, templates: DashboardTemplate[]): Widget[] {
  // Try to find a matching template for the industry
  const matchingTemplate = templates.find(
    (t) => t.target_industry === industry && t.is_system
  );

  if (matchingTemplate?.layout) {
    const layout = matchingTemplate.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      return layout;
    }
    if (layout.widgets) {
      return layout.widgets;
    }
  }

  // Fall back to general financial template
  const generalTemplate = templates.find(
    (t) => t.target_industry === null && t.is_system
  );

  if (generalTemplate?.layout) {
    const layout = generalTemplate.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      return layout;
    }
    if (layout.widgets) {
      return layout.widgets;
    }
  }

  // Hardcoded fallback
  return [
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
    {
      id: "table-1",
      type: "table",
      x: 0,
      y: 3,
      w: 12,
      h: 2,
      config: {
        metrics: ["Revenue", "Gross Margin", "Burn Rate", "Runway"],
        periodType: "quarterly",
        title: "Key Metrics",
      },
    },
  ] as Widget[];
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

export function CompanyDashboardClient({
  companyId,
  companyName,
  companyIndustry,
  metrics,
  views,
  templates,
}: CompanyDashboardClientProps) {
  const [selectedViewId, setSelectedViewId] = React.useState<string | null>(
    views.find((v) => v.is_default)?.id ?? views[0]?.id ?? null
  );
  const [periodType, setPeriodType] = React.useState<PeriodType>("quarterly");
  const [dateRange, setDateRange] = React.useState<DateRange>("1y");

  // Get the current layout
  const currentView = views.find((v) => v.id === selectedViewId);
  let widgets: Widget[];

  if (currentView?.layout) {
    const layout = currentView.layout as DashboardLayout | Widget[];
    if (Array.isArray(layout)) {
      widgets = layout;
    } else if (layout.widgets) {
      widgets = layout.widgets;
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ViewSelector
            views={views.map((v) => ({
              id: v.id,
              name: v.name,
              isDefault: v.is_default,
            }))}
            selectedViewId={selectedViewId}
            onChange={setSelectedViewId}
          />
          <PeriodSelector value={periodType} onChange={setPeriodType} />
          <DateRangeSelector value={dateRange} onChange={setDateRange} />
        </div>
        <ExportButton
          companyId={companyId}
          companyName={companyName}
          periodType={periodType}
        />
      </div>

      {/* Dashboard grid */}
      <div className="grid grid-cols-12 gap-4">
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
            style={{
              gridColumn: `span ${widget.w}`,
              minHeight: `${widget.h * 100}px`,
            }}
          >
            <DashboardWidget
              widget={widget}
              metrics={filteredMetrics}
              periodTypeOverride={periodType}
            />
          </div>
        ))}
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

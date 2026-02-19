"use client";

import * as React from "react";
import { GridLayout, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical, Settings } from "lucide-react";
import { Widget, MetricValue, PeriodType, isChartConfig, isMetricCardConfig, isTableConfig } from "./types";
import { DashboardWidget } from "./dashboard-widget";

type DashboardCanvasProps = {
  widgets: Widget[];
  metrics?: MetricValue[];
  periodType?: PeriodType;
  onLayoutChange: (widgets: Widget[]) => void;
  onSelectWidget: (widgetId: string | null) => void;
  selectedWidgetId: string | null;
};

export function DashboardCanvas({
  widgets,
  metrics,
  periodType,
  onLayoutChange,
  onSelectWidget,
  selectedWidgetId,
}: DashboardCanvasProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = React.useState(1200);

  // Track container width for responsive grid
  React.useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Convert widgets to grid layout format
  const layout: Layout = widgets.map((w) => ({
    i: w.id,
    x: w.x,
    y: w.y,
    w: w.w,
    h: w.h,
    minW: 2,
    minH: 1,
    maxW: 12,
    maxH: 4,
  }));

  function handleLayoutChange(newLayout: Layout) {
    const updatedWidgets = widgets.map((widget) => {
      const layoutItem = newLayout.find((l) => l.i === widget.id);
      if (!layoutItem) return widget;
      return {
        ...widget,
        x: layoutItem.x,
        y: layoutItem.y,
        w: layoutItem.w,
        h: layoutItem.h,
      };
    });
    onLayoutChange(updatedWidgets);
  }

  // Also handle drag/resize stop events for more reliable updates
  function handleDragStop(
    layout: Layout,
    _oldItem: unknown,
    _newItem: unknown,
  ) {
    handleLayoutChange(layout);
  }

  function handleResizeStop(
    layout: Layout,
    _oldItem: unknown,
    _newItem: unknown,
  ) {
    handleLayoutChange(layout);
  }

  function getWidgetLabel(widget: Widget): string {
    const { config } = widget;
    if (isChartConfig(config) && config.title) return config.title;
    if (isMetricCardConfig(config) && config.title) return config.title;
    if (isTableConfig(config) && config.title) return config.title;
    // Fallback
    if (isChartConfig(config)) {
      const type = config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1);
      return `${type} Chart`;
    }
    if (isMetricCardConfig(config)) return config.metric || "Metric Card";
    if (isTableConfig(config)) return "Metrics Table";
    return "Widget";
  }

  const hasMetrics = metrics && metrics.length > 0;

  if (widgets.length === 0) {
    return (
      <div ref={containerRef} className="min-h-[400px] rounded-xl border-2 border-dashed border-border-default bg-bg-input flex items-center justify-center">
        <p className="text-text-muted">
          Drag widgets from the library or click to add them to your dashboard
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-[400px] rounded-xl border border-border-default bg-bg-input">
      <GridLayout
        className="layout"
        layout={layout}
        width={containerWidth}
        gridConfig={{
          cols: 12,
          rowHeight: 100,
          margin: [16, 16],
        }}
        dragConfig={{
          handle: ".drag-handle",
        }}
        resizeConfig={{
          enabled: true,
        }}
        onLayoutChange={handleLayoutChange}
        onDragStop={handleDragStop}
        onResizeStop={handleResizeStop}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            className={`
              rounded-lg border bg-bg-elevated overflow-hidden
              ${selectedWidgetId === widget.id ? "border-[var(--info-accent)] ring-1 ring-[var(--ring-focus)]" : "border-border-default"}
            `}
          >
            {/* Widget header */}
            <div className="drag-handle flex items-center justify-between border-b border-border-subtle bg-bg-input px-2 py-1 cursor-move">
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 text-text-faint" />
                <span className="text-xs text-text-tertiary truncate max-w-[200px]">
                  {getWidgetLabel(widget)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWidget(selectedWidgetId === widget.id ? null : widget.id);
                }}
                className="p-1 text-text-muted hover:text-text-tertiary"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Widget preview — live preview if metrics available, text fallback otherwise */}
            <div className="h-[calc(100%-28px)] overflow-hidden">
              {hasMetrics ? (
                <div className="h-full w-full scale-[0.85] origin-top-left" style={{ width: "117.6%" }}>
                  <DashboardWidget
                    widget={widget}
                    metrics={metrics}
                    periodTypeOverride={periodType}
                  />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center p-3">
                  <span className="text-xs text-text-faint text-center">
                    {getWidgetLabel(widget)}
                  </span>
                </div>
              )}
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

"use client";

import * as React from "react";
import { GridLayout, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import { GripVertical, Settings } from "lucide-react";
import { Widget, isChartConfig, isMetricCardConfig, isTableConfig } from "./types";

type DashboardCanvasProps = {
  widgets: Widget[];
  onLayoutChange: (widgets: Widget[]) => void;
  onSelectWidget: (widgetId: string | null) => void;
  selectedWidgetId: string | null;
};

export function DashboardCanvas({
  widgets,
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

  function getWidgetPreview(widget: Widget): string {
    const { config } = widget;
    if (isChartConfig(config)) {
      const type = config.chartType.charAt(0).toUpperCase() + config.chartType.slice(1);
      return `${type} Chart: ${config.metrics.join(", ") || "No metrics"}`;
    }
    if (isMetricCardConfig(config)) {
      return `Card: ${config.metric || "No metric"}`;
    }
    if (isTableConfig(config)) {
      return `Table: ${config.metrics.join(", ") || "No metrics"}`;
    }
    return "Unknown widget";
  }

  if (widgets.length === 0) {
    return (
      <div ref={containerRef} className="min-h-[400px] rounded-xl border-2 border-dashed border-white/10 bg-black/20 flex items-center justify-center">
        <p className="text-white/40">
          Drag widgets from the library or click to add them to your dashboard
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-[400px] rounded-xl border border-white/10 bg-black/20 p-2">
      <GridLayout
        className="layout"
        layout={layout}
        width={containerWidth - 16}
        gridConfig={{
          cols: 12,
          rowHeight: 100,
          margin: [8, 8],
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
              rounded-lg border bg-white/5 overflow-hidden
              ${selectedWidgetId === widget.id ? "border-blue-500/50 ring-1 ring-blue-500/30" : "border-white/10"}
            `}
          >
            {/* Widget header */}
            <div className="drag-handle flex items-center justify-between border-b border-white/5 bg-black/20 px-2 py-1 cursor-move">
              <div className="flex items-center gap-1.5">
                <GripVertical className="h-3.5 w-3.5 text-white/30" />
                <span className="text-xs text-white/50 truncate max-w-[200px]">
                  {isChartConfig(widget.config) && widget.config.title
                    ? widget.config.title
                    : isMetricCardConfig(widget.config) && widget.config.title
                      ? widget.config.title
                      : isTableConfig(widget.config) && widget.config.title
                        ? widget.config.title
                        : getWidgetPreview(widget)}
                </span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectWidget(selectedWidgetId === widget.id ? null : widget.id);
                }}
                className="p-1 text-white/40 hover:text-white/60"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Widget preview */}
            <div className="p-3 flex items-center justify-center h-[calc(100%-28px)]">
              <span className="text-xs text-white/30 text-center">
                {getWidgetPreview(widget)}
              </span>
            </div>
          </div>
        ))}
      </GridLayout>
    </div>
  );
}

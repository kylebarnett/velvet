"use client";

import * as React from "react";
import { X, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Widget,
  ChartConfig,
  MetricCardConfig,
  TableConfig,
  isChartConfig,
  isMetricCardConfig,
  isTableConfig,
} from "./types";

type WidgetConfigProps = {
  widget: Widget;
  availableMetrics: string[];
  onChange: (updatedWidget: Widget) => void;
  onDelete: () => void;
  onClose: () => void;
};

export function WidgetConfig({
  widget,
  availableMetrics,
  onChange,
  onDelete,
  onClose,
}: WidgetConfigProps) {
  const { config } = widget;

  function updateConfig(updates: Partial<ChartConfig | MetricCardConfig | TableConfig>) {
    onChange({
      ...widget,
      config: { ...config, ...updates } as ChartConfig | MetricCardConfig | TableConfig,
    });
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-white/80">Configure Widget</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-white/40 hover:text-white/60"
          aria-label="Close widget configuration"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Title field (common to all) */}
        <div>
          <label className="block text-xs text-white/60 mb-1">Title</label>
          <input
            type="text"
            value={
              isChartConfig(config)
                ? config.title ?? ""
                : isMetricCardConfig(config)
                  ? config.title ?? ""
                  : isTableConfig(config)
                    ? config.title ?? ""
                    : ""
            }
            onChange={(e) => updateConfig({ title: e.target.value || undefined })}
            placeholder="Widget title"
            className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
          />
        </div>

        {/* Chart-specific config */}
        {isChartConfig(config) && (
          <>
            <div>
              <label className="block text-xs text-white/60 mb-1">Chart Type</label>
              <Select value={config.chartType} onValueChange={(v) => updateConfig({ chartType: v as ChartConfig["chartType"] })}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">Line</SelectItem>
                  <SelectItem value="bar">Bar</SelectItem>
                  <SelectItem value="area">Area</SelectItem>
                  <SelectItem value="pie">Pie</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Metrics</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableMetrics.length === 0 ? (
                  <p className="text-xs text-white/40">No metrics available</p>
                ) : (
                  availableMetrics.map((metric) => (
                    <label
                      key={metric}
                      className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white/90"
                    >
                      <input
                        type="checkbox"
                        checked={config.metrics.includes(metric)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateConfig({ metrics: [...config.metrics, metric] });
                          } else {
                            updateConfig({
                              metrics: config.metrics.filter((m) => m !== metric),
                            });
                          }
                        }}
                        className="rounded border-white/20"
                      />
                      {metric}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Period</label>
              <Select value={config.periodType} onValueChange={(v) => updateConfig({ periodType: v as ChartConfig["periodType"] })}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(e) => updateConfig({ showLegend: e.target.checked })}
                className="rounded border-white/20"
              />
              Show legend
            </label>
          </>
        )}

        {/* Metric card config */}
        {isMetricCardConfig(config) && (
          <>
            <div>
              <label className="block text-xs text-white/60 mb-1">Metric</label>
              <Select value={config.metric || "__none__"} onValueChange={(v) => updateConfig({ metric: v === "__none__" ? "" : v })}>
                <SelectTrigger size="sm">
                  <SelectValue placeholder="Select a metric..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select a metric...</SelectItem>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric} value={metric}>
                      {metric}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70 cursor-pointer">
              <input
                type="checkbox"
                checked={config.showTrend}
                onChange={(e) => updateConfig({ showTrend: e.target.checked })}
                className="rounded border-white/20"
              />
              Show trend indicator
            </label>
          </>
        )}

        {/* Table config */}
        {isTableConfig(config) && (
          <>
            <div>
              <label className="block text-xs text-white/60 mb-1">Metrics</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableMetrics.length === 0 ? (
                  <p className="text-xs text-white/40">No metrics available</p>
                ) : (
                  availableMetrics.map((metric) => (
                    <label
                      key={metric}
                      className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:text-white/90"
                    >
                      <input
                        type="checkbox"
                        checked={config.metrics.includes(metric)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            updateConfig({ metrics: [...config.metrics, metric] });
                          } else {
                            updateConfig({
                              metrics: config.metrics.filter((m) => m !== metric),
                            });
                          }
                        }}
                        className="rounded border-white/20"
                      />
                      {metric}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Period</label>
              <Select value={config.periodType} onValueChange={(v) => updateConfig({ periodType: v as TableConfig["periodType"] })}>
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Delete button */}
        <button
          type="button"
          onClick={onDelete}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300 hover:bg-red-500/20"
        >
          <Trash2 className="h-4 w-4" />
          Delete Widget
        </button>
      </div>
    </div>
  );
}

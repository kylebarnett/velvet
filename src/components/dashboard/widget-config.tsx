"use client";

import * as React from "react";
import { X, Trash2 } from "lucide-react";
import { formatMetricDisplayName } from "@/lib/metric-definitions";
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
    <div className="rounded-xl border border-border-default card-surface p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-text-secondary">Configure Widget</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-text-muted hover:text-text-tertiary"
          aria-label="Close widget configuration"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Title field (common to all) */}
        <div>
          <label htmlFor="widget-title" className="block text-xs text-text-tertiary mb-1">Title</label>
          <input
            id="widget-title"
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
            className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm placeholder:text-text-muted focus:border-[var(--border-default)] focus:outline-none"
          />
        </div>

        {/* Chart-specific config */}
        {isChartConfig(config) && (
          <>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Chart Type</label>
              <Select value={config.chartType} onValueChange={(v) => updateConfig({ chartType: v as ChartConfig["chartType"] })}>
                <SelectTrigger>
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
              <label className="block text-xs text-text-tertiary mb-1">Metrics</label>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {availableMetrics.length === 0 ? (
                  <p className="text-xs text-text-muted">No metrics available</p>
                ) : (
                  availableMetrics.map((metric) => (
                    <label
                      key={metric}
                      className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary"
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
                        className="rounded border-border-default"
                      />
                      {formatMetricDisplayName(metric)}
                    </label>
                  ))
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-text-tertiary mb-1">Period</label>
              <Select value={config.periodType} onValueChange={(v) => updateConfig({ periodType: v as ChartConfig["periodType"] })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={config.showLegend}
                onChange={(e) => updateConfig({ showLegend: e.target.checked })}
                className="rounded border-border-default"
              />
              Show legend
            </label>
          </>
        )}

        {/* Metric card config */}
        {isMetricCardConfig(config) && (
          <>
            <div>
              <label className="block text-xs text-text-tertiary mb-1">Metric</label>
              <Select value={config.metric || "__none__"} onValueChange={(v) => updateConfig({ metric: v === "__none__" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a metric..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Select a metric...</SelectItem>
                  {availableMetrics.map((metric) => (
                    <SelectItem key={metric} value={metric}>
                      {formatMetricDisplayName(metric)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <label className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer">
              <input
                type="checkbox"
                checked={config.showTrend}
                onChange={(e) => updateConfig({ showTrend: e.target.checked })}
                className="rounded border-border-default"
              />
              Show trend indicator
            </label>
          </>
        )}

        {/* Table config */}
        {isTableConfig(config) && (
          <>
            {config.showAllMetrics ? (
              <p className="text-xs text-text-tertiary">
                Automatically displays all submitted metrics.
              </p>
            ) : (
              <div>
                <label className="block text-xs text-text-tertiary mb-1">Metrics</label>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {availableMetrics.length === 0 ? (
                    <p className="text-xs text-text-muted">No metrics available</p>
                  ) : (
                    availableMetrics.map((metric) => (
                      <label
                        key={metric}
                        className="flex items-center gap-2 text-sm text-text-secondary cursor-pointer hover:text-text-primary"
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
                          className="rounded border-border-default"
                        />
                        {formatMetricDisplayName(metric)}
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs text-text-tertiary mb-1">Period</label>
              <Select value={config.periodType} onValueChange={(v) => updateConfig({ periodType: v as TableConfig["periodType"] })}>
                <SelectTrigger>
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

        {/* Delete button — hidden for the All Metrics table */}
        {!(isTableConfig(config) && config.showAllMetrics) && (
          <button
            type="button"
            onClick={onDelete}
            className="flex w-full items-center justify-center gap-2 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)] hover:bg-[var(--error-bg-subtle)]"
          >
            <Trash2 className="h-4 w-4" />
            Delete Widget
          </button>
        )}
      </div>
    </div>
  );
}

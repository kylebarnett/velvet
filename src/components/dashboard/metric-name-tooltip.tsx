"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Pencil, X } from "lucide-react";
import {
  resolveMetricDefinition,
  inferMetricValueType,
  getMetricDefinition,
  type MetricValueType,
} from "@/lib/metric-definitions";
import { getDefaultAggregationType, getAggregationIndicator } from "@/lib/metrics/temporal-aggregation";
import { useMetricDefinitions } from "@/contexts/metric-definitions-context";

const VALUE_TYPE_LABELS: Record<MetricValueType, string> = {
  currency: "Currency",
  percent: "Percentage",
  number: "Number",
  ratio: "Ratio",
  time: "Time",
};

type MetricNameTooltipProps = {
  metricName: string;
  periodType: string;
  triggerRect: DOMRect;
  onClose: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
};

export function MetricNameTooltip({
  metricName,
  periodType,
  triggerRect,
  onClose,
  onMouseEnter,
  onMouseLeave,
}: MetricNameTooltipProps) {
  const { customDefinitions, saveDefinition, deleteDefinition } = useMetricDefinitions();
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState("");
  const [formula, setFormula] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);

  const { info, isCustom } = resolveMetricDefinition(metricName, customDefinitions);
  const valueType = inferMetricValueType(metricName);
  const aggregationType = getDefaultAggregationType(metricName);
  const { symbol: aggSymbol, label: aggLabel } = getAggregationIndicator(aggregationType);

  // Position tooltip to the right of the trigger cell
  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltipHeight = tooltipRef.current.offsetHeight;
    const tooltipWidth = 280;

    let left = triggerRect.right + 8;
    let top = triggerRect.top + (triggerRect.height / 2) - (tooltipHeight / 2);

    // If not enough room on the right, show on the left
    if (left + tooltipWidth > window.innerWidth - 16) {
      left = triggerRect.left - tooltipWidth - 8;
    }

    // Clamp vertically
    if (top < 16) top = 16;
    if (top + tooltipHeight > window.innerHeight - 16) {
      top = window.innerHeight - tooltipHeight - 16;
    }

    setPosition({ top, left });
  }, [triggerRect, isEditing]);

  // Close on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (isEditing) {
          setIsEditing(false);
        } else {
          onClose();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, isEditing]);

  const startEditing = useCallback(() => {
    setDescription(info?.description ?? "");
    setFormula(info?.formula ?? "");
    setIsEditing(true);
  }, [info]);

  const handleSave = useCallback(async () => {
    if (!description.trim()) return;
    setIsSaving(true);
    try {
      await saveDefinition(metricName, {
        description: description.trim(),
        formula: formula.trim() || undefined,
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [metricName, description, formula, saveDefinition]);

  const handleReset = useCallback(async () => {
    setIsSaving(true);
    try {
      await deleteDefinition(metricName);
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  }, [metricName, deleteDefinition]);

  const hasSystemDef = !!getMetricDefinition(metricName);
  const canReset = isCustom && hasSystemDef;

  const style: React.CSSProperties = position
    ? { position: "fixed", top: position.top, left: position.left, opacity: 1 }
    : { position: "fixed", top: -9999, left: -9999, opacity: 0 };

  return createPortal(
    <div
      ref={tooltipRef}
      className="z-[100] w-[280px] rounded-lg border border-white/10 bg-zinc-900 shadow-xl"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Bridge element to connect tooltip to trigger */}
      <div
        className="absolute top-0 bottom-0 w-4"
        style={{ left: -16 }}
      />

      {isEditing ? (
        /* Edit Mode */
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-white/90 truncate">
              Edit: {metricName}
            </span>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="text-white/40 hover:text-white/70 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-md border border-white/10 bg-black/30 px-2.5 py-2 text-xs text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              placeholder="What this metric measures..."
            />
          </div>

          <div>
            <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-white/40">
              Formula (optional)
            </label>
            <input
              type="text"
              value={formula}
              onChange={(e) => setFormula(e.target.value)}
              className="h-8 w-full rounded-md border border-white/10 bg-black/30 px-2.5 text-xs font-mono text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none"
              placeholder="e.g. Revenue / Customers"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            {canReset ? (
              <button
                type="button"
                onClick={handleReset}
                disabled={isSaving}
                className="text-[10px] text-white/40 underline underline-offset-2 hover:text-white/60 disabled:opacity-50"
              >
                Reset to default
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!description.trim() || isSaving}
                className="rounded-md bg-white px-2.5 py-1 text-[11px] font-medium text-black hover:bg-white/90 disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* View Mode */
        <div className="p-3 space-y-2.5">
          {/* Header */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-xs font-medium text-white/90 truncate">
                {metricName}
              </span>
              {isCustom && (
                <span className="shrink-0 rounded bg-violet-500/20 px-1 py-px text-[9px] font-medium text-violet-300">
                  Custom
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={startEditing}
              className="shrink-0 rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/60 transition-colors"
              title="Edit definition"
            >
              <Pencil className="h-3 w-3" />
            </button>
          </div>

          {/* Description */}
          {info?.description ? (
            <p className="text-[11px] leading-relaxed text-white/60">
              {info.description}
            </p>
          ) : (
            <p
              className="cursor-pointer text-[11px] italic text-white/30 hover:text-white/50"
              onClick={startEditing}
            >
              No description yet — click to add one
            </p>
          )}

          {/* Formula */}
          {info?.formula && (
            <div className="rounded-md bg-white/[0.03] px-2 py-1.5">
              <span className="block text-[9px] font-medium uppercase tracking-wider text-white/30 mb-0.5">
                Formula
              </span>
              <span className="block text-[11px] font-mono text-emerald-400/80">
                {info.formula}
              </span>
            </div>
          )}

          {/* Metadata footer */}
          <div className="flex items-center gap-1.5 border-t border-white/[0.06] pt-2 text-[10px] text-white/35">
            <span>{VALUE_TYPE_LABELS[valueType]}</span>
            <span>·</span>
            <span title={aggLabel}>{aggSymbol} {aggregationType === "sum" ? "Sum" : "Latest"}</span>
            <span>·</span>
            <span className="capitalize">{periodType}</span>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

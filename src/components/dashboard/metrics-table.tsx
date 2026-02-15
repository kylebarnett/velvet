"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { createPortal } from "react-dom";
import { formatValue, formatPeriod } from "@/components/charts/types";
import { Sparkles, RotateCcw, Info, GripVertical, ArrowUpDown, Plus, Pencil, Layers } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  getDefaultAggregationType,
  calculateRollingTotal,
  getAggregationIndicator,
  type AggregationType,
} from "@/lib/metrics/temporal-aggregation";
import { MetricNameTooltip } from "@/components/dashboard/metric-name-tooltip";

type PeriodData = {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  source?: string;
  aiConfidence?: number | null;
  submittedAt?: string;
  updatedAt?: string;
  rollupDetail?: string;
};

type MetricRow = {
  metricName: string;
  periodType: string;
  source?: string;
  aiConfidence?: number | null;
  periods: PeriodData[];
  /** Override the default aggregation type for totals */
  aggregationType?: AggregationType;
};

type MetricsTableProps = {
  data: MetricRow[];
  title?: string;
  onMetricClick?: (metricName: string, periodStart?: string) => void;
  /** Show the Total column (default: true) */
  showTotals?: boolean;
  /** Callback when metrics are reordered */
  onReorder?: (metricNames: string[]) => void;
  /** Allow reordering (default: true) */
  allowReorder?: boolean;
  /** Storage key for persisting metric order (e.g., "metrics-order-{companyId}") */
  storageKey?: string;
  /** Callback to add a new metric (renders + Add Metric button below table) */
  onAddMetric?: () => void;
  /** Enable click-to-edit on cells (founder dashboard) */
  editable?: boolean;
  /** Submit a single value edit — returns true on success */
  onValueSubmit?: (metricName: string, periodStart: string, periodEnd: string, periodType: string, value: string) => Promise<boolean>;
  /** Actions rendered in the table toolbar (e.g. export button) */
  headerActions?: React.ReactNode;
};

type HoveredCell = {
  metricName: string;
  periodStart: string;
  rect: DOMRect;
} | null;

function formatSourceLabel(source?: string): string {
  if (!source) return "Manual";
  switch (source) {
    case "ai_extracted":
      return "AI Extracted";
    case "override":
      return "Override";
    case "manual":
      return "Manual";
    case "rollup":
      return "Rolled Up";
    default:
      return source.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function CellTooltip({
  periodData,
  onViewDetails,
  cellRect,
  onMouseEnter,
  onMouseLeave,
}: {
  periodData: PeriodData;
  onViewDetails: () => void;
  cellRect: DOMRect;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [showAbove, setShowAbove] = useState(true);

  useEffect(() => {
    if (!tooltipRef.current) return;

    const tooltipHeight = tooltipRef.current.offsetHeight;
    const tooltipWidth = 224; // w-56 = 14rem = 224px

    // Determine if we should show above or below
    const spaceAbove = cellRect.top;
    const spaceBelow = window.innerHeight - cellRect.bottom;
    const shouldShowAbove = spaceAbove >= tooltipHeight + 8 || spaceAbove > spaceBelow;

    setShowAbove(shouldShowAbove);

    // Calculate position
    let top: number;
    if (shouldShowAbove) {
      top = cellRect.top - tooltipHeight - 4;
    } else {
      top = cellRect.bottom + 4;
    }

    // Align right edge of tooltip with right edge of cell
    let left = cellRect.right - tooltipWidth;
    // Keep tooltip within viewport
    if (left < 8) left = 8;
    if (left + tooltipWidth > window.innerWidth - 8) {
      left = window.innerWidth - tooltipWidth - 8;
    }

    setPosition({ top, left });
  }, [cellRect]);

  const isAi = periodData.source === "ai_extracted";
  const displayDate = periodData.updatedAt || periodData.submittedAt;

  // Render invisible initially to measure, then position
  const style: React.CSSProperties = position
    ? { position: "fixed", top: position.top, left: position.left, opacity: 1 }
    : { position: "fixed", top: -9999, left: -9999, opacity: 0 };

  return createPortal(
    <div
      ref={tooltipRef}
      className="z-[100] w-56 rounded-lg border border-border-default bg-bg-secondary p-3 shadow-xl"
      style={style}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {/* Invisible bridge to connect tooltip to cell */}
      <div
        className="absolute left-0 right-0 h-3"
        style={showAbove ? { bottom: -12 } : { top: -12 }}
      />

      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between">
          <span className="text-text-tertiary">Source</span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              isAi
                ? "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]"
                : periodData.source === "override"
                  ? "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]"
                  : periodData.source === "rollup"
                    ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]"
                    : "bg-bg-hover text-text-secondary"
            }`}
          >
            {formatSourceLabel(periodData.source)}
          </span>
        </div>

        {isAi && periodData.aiConfidence != null && (
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Confidence</span>
            <span className="text-text-secondary">
              {Math.round(periodData.aiConfidence * 100)}%
            </span>
          </div>
        )}

        {periodData.rollupDetail && (
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Calculation</span>
            <span className="text-text-secondary">{periodData.rollupDetail}</span>
          </div>
        )}

        {displayDate && (
          <div className="flex items-center justify-between">
            <span className="text-text-tertiary">Last updated</span>
            <span className="text-text-secondary">{formatDate(displayDate)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="mt-1 w-full rounded-md border border-border-default bg-bg-elevated px-2 py-1.5 text-center text-xs font-medium text-text-secondary hover:bg-bg-hover"
        >
          View details
        </button>
      </div>
    </div>,
    document.body
  );
}

type MetricInfoTooltipState = {
  metricName: string;
  periodType: string;
  rect: DOMRect;
} | null;

type EditingCell = {
  metricName: string;
  periodStart: string;
} | null;

type SortableMetricRowProps = {
  metric: MetricRow;
  displayPeriods: string[];
  visiblePeriods: string[];
  showTotals: boolean;
  isReorderMode: boolean;
  hoveredCell: HoveredCell;
  onCellMouseEnter: (metricName: string, periodStart: string, cellEl: HTMLTableCellElement) => void;
  onCellMouseLeave: () => void;
  onMetricInfoHover: (metricName: string, periodType: string, rect: DOMRect) => void;
  onMetricInfoLeave: () => void;
  rowIndex?: number;
  editable?: boolean;
  editingCell?: EditingCell;
  editInputValue?: string;
  editSaving?: boolean;
  onEditStart?: (metricName: string, periodStart: string, currentValue: string) => void;
  onEditChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
};

function SortableMetricRow({
  metric,
  displayPeriods,
  visiblePeriods,
  showTotals,
  isReorderMode,
  hoveredCell,
  onCellMouseEnter,
  onCellMouseLeave,
  onMetricInfoHover,
  onMetricInfoLeave,
  rowIndex,
  editable,
  editingCell,
  editInputValue,
  editSaving,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: SortableMetricRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.metricName });
  const infoBtnRef = useRef<HTMLButtonElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Determine aggregation type for total
  const aggregationType = metric.aggregationType ?? getDefaultAggregationType(metric.metricName);
  const { symbol: aggSymbol } = getAggregationIndicator(aggregationType);

  const handleInfoClick = useCallback(() => {
    if (infoBtnRef.current) {
      const rect = infoBtnRef.current.getBoundingClientRect();
      onMetricInfoHover(metric.metricName, metric.periodType, rect);
    }
  }, [metric.metricName, metric.periodType, onMetricInfoHover]);

  const handleNameMouseEnter = useCallback(() => {
    if (infoBtnRef.current) {
      const rect = infoBtnRef.current.getBoundingClientRect();
      onMetricInfoHover(metric.metricName, metric.periodType, rect);
    }
  }, [metric.metricName, metric.periodType, onMetricInfoHover]);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`group border-b border-border-subtle transition-colors duration-100 ${isDragging ? "bg-bg-elevated" : "hover:bg-bg-elevated"} ${!isDragging && rowIndex != null && rowIndex % 2 === 1 ? "bg-[var(--table-row-alt)]" : ""}`}
    >
      {isReorderMode && (
        <td className="sticky left-0 z-10 w-8 bg-[var(--table-bg)] py-3 pl-2">
          <button
            type="button"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-text-muted hover:bg-bg-hover hover:text-text-tertiary active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td
        className={`sticky ${isReorderMode ? "left-8" : "left-0"} z-10 overflow-hidden bg-[var(--table-bg)] py-3 pl-3 pr-4`}
        style={{ boxShadow: "4px 0 6px -4px var(--table-sticky-shadow)" }}
      >
        <span
          className="inline-flex max-w-full items-center gap-1.5 cursor-default"
          title={metric.metricName}
          onMouseEnter={handleNameMouseEnter}
          onMouseLeave={onMetricInfoLeave}
        >
          <span className="truncate font-medium text-text-primary">{metric.metricName}</span>
          <span
            ref={infoBtnRef}
            className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 text-text-faint"
            aria-hidden="true"
          >
            <Info className="h-3 w-3" />
          </span>
        </span>
      </td>
      {displayPeriods.map((period) => {
        const periodData = metric.periods.find(
          (p) => p.periodStart === period,
        );
        const hasData = periodData && periodData.value != null;
        const isHovered =
          hoveredCell?.metricName === metric.metricName &&
          hoveredCell?.periodStart === period;
        const isEditing =
          editingCell?.metricName === metric.metricName &&
          editingCell?.periodStart === period;
        const canEdit = editable && !isReorderMode;

        return (
          <td
            key={period}
            className={`overflow-hidden px-3 py-3 text-right font-mono text-[13px] ${
              isEditing
                ? "p-1"
                : hasData
                  ? `${canEdit ? "cursor-pointer" : "cursor-default"} text-text-primary transition-colors duration-100 hover:bg-bg-elevated`
                  : canEdit
                    ? "cursor-pointer transition-colors duration-100 hover:bg-bg-elevated"
                    : ""
            } ${isHovered && !isEditing ? "bg-bg-elevated" : ""}`}
            onMouseEnter={
              hasData && !isReorderMode && !isEditing
                ? (e) =>
                    onCellMouseEnter(
                      metric.metricName,
                      period,
                      e.currentTarget,
                    )
                : undefined
            }
            onMouseLeave={hasData && !isReorderMode && !isEditing ? onCellMouseLeave : undefined}
            onClick={
              canEdit && !isEditing
                ? () => {
                    const rawValue = hasData ? String(periodData.value) : "";
                    onEditStart?.(metric.metricName, period, rawValue);
                  }
                : undefined
            }
          >
            {isEditing ? (
              <input
                type="text"
                value={editInputValue ?? ""}
                onChange={(e) => onEditChange?.(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    onEditSave?.();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    onEditCancel?.();
                  }
                }}
                onBlur={() => {
                  // Cancel on blur unless actively saving
                  if (!editSaving) onEditCancel?.();
                }}
                autoFocus
                disabled={editSaving}
                className="h-8 w-full rounded-md border border-border-active bg-bg-input px-2 text-center text-sm font-mono text-text-primary focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)] disabled:opacity-60"
              />
            ) : (
              <span className="group/cell relative flex items-center justify-end gap-1 truncate whitespace-nowrap">
                {periodData?.source === "ai_extracted" && (
                  <Sparkles className="h-3 w-3 shrink-0 text-[var(--tag-violet-text)]" />
                )}
                {periodData?.source === "override" && (
                  <RotateCcw className="h-3 w-3 shrink-0 text-[var(--tag-amber-text)]" />
                )}
                {periodData?.source === "rollup" && (
                  <Layers className="h-3 w-3 shrink-0 text-[var(--tag-blue-text)]" />
                )}
                {hasData ? (
                  <>
                    {formatValue(periodData.value, metric.metricName)}
                    {canEdit && (
                      <Pencil className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 text-text-faint opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                    )}
                  </>
                ) : canEdit ? (
                  <span className="text-text-faint opacity-0 group-hover/cell:opacity-100 transition-opacity">+</span>
                ) : (
                  <span className="text-text-faint">—</span>
                )}
              </span>
            )}
          </td>
        );
      })}
      {showTotals && (() => {
        // Aggregate over the 4 currently visible periods
        const values = visiblePeriods.map((period) => {
          const periodData = metric.periods.find((p) => p.periodStart === period);
          return periodData?.value ?? null;
        });

        const total = calculateRollingTotal(values, aggregationType);

        return (
          <td
            className="sticky right-0 z-10 overflow-hidden bg-[var(--table-bg)] py-3 px-3 text-right font-mono text-[13px]"
            style={{ boxShadow: "-4px 0 6px -4px var(--table-sticky-shadow)" }}
          >
            {total !== null ? (
              <span className="block truncate whitespace-nowrap font-semibold text-text-primary" title={`${aggSymbol} ${aggregationType === "sum" ? "Sum" : "Latest"}: ${formatValue(total, metric.metricName)}`}>
                {formatValue(total, metric.metricName)}
              </span>
            ) : (
              <span className="text-text-faint">—</span>
            )}
          </td>
        );
      })()}
    </tr>
  );
}

function TotalColumnTooltip({ periodType, periodsVisible }: { periodType: string; periodsVisible: number }) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const periodLabel = periodType === "quarterly" ? "quarters" : periodType === "monthly" ? "months" : "periods";

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
    }
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="text-text-muted hover:text-text-tertiary"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {isOpen && pos && createPortal(
        <div
          className="fixed z-[100] w-64 rounded-lg border border-border-default bg-bg-secondary p-3 text-xs shadow-xl"
          style={{ top: pos.top, right: pos.right }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <p className="font-medium text-text-primary">Total</p>
          <p className="mt-1 text-text-tertiary">
            Calculated across the {periodsVisible} visible {periodLabel}. Updates as you scroll.
          </p>
          <div className="mt-2 space-y-1.5 border-t border-border-default pt-2 text-text-tertiary">
            <p><span className="text-text-secondary">Σ Flow metrics</span> (Revenue, Expenses) are summed.</p>
            <p><span className="text-text-secondary">● Point-in-time metrics</span> (ARR, Burn Rate) show the most recent value.</p>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// Helper to sort data by saved order
function sortDataByOrder(data: MetricRow[], savedOrder: string[]): MetricRow[] {
  if (!savedOrder.length) return data;

  const orderMap = new Map(savedOrder.map((name, idx) => [name.toLowerCase(), idx]));

  return [...data].sort((a, b) => {
    const aIdx = orderMap.get(a.metricName.toLowerCase());
    const bIdx = orderMap.get(b.metricName.toLowerCase());

    // If both have saved positions, sort by those
    if (aIdx !== undefined && bIdx !== undefined) {
      return aIdx - bIdx;
    }
    // Items with saved positions come first
    if (aIdx !== undefined) return -1;
    if (bIdx !== undefined) return 1;
    // Otherwise maintain original order
    return 0;
  });
}

// Preference key for metric order
function getPreferenceKey(storageKey: string): string {
  return `metric_order.${storageKey}`;
}

/** Virtualization threshold — only virtualize when row count exceeds this */
const VIRTUALIZE_THRESHOLD = 30;
/** Estimated row height in pixels for the virtualizer */
const ESTIMATED_ROW_HEIGHT = 44;

type MetricsTableBodyProps = {
  scrollRef: React.RefObject<HTMLDivElement | null>;
  displayData: MetricRow[];
  displayPeriods: string[];
  visiblePeriods: string[];
  showTotals: boolean;
  isReorderMode: boolean;
  hoveredCell: HoveredCell;
  handleCellMouseEnter: (metricName: string, periodStart: string, cellEl: HTMLTableCellElement) => void;
  handleCellMouseLeave: () => void;
  handleMetricInfoHover: (metricName: string, periodType: string, rect: DOMRect) => void;
  handleMetricInfoLeave: () => void;
  handleResizeStart: (e: React.MouseEvent) => void;
  periodHeaderRefs: React.MutableRefObject<Map<string, HTMLTableCellElement>>;
  observerRef: React.MutableRefObject<IntersectionObserver | null>;
  periodColWidth: number | null;
  GRIP_COL_WIDTH: number;
  METRIC_COL_WIDTH: number;
  TOTAL_COL_WIDTH: number;
  editable?: boolean;
  editingCell?: EditingCell;
  editInputValue?: string;
  editSaving?: boolean;
  onEditStart?: (metricName: string, periodStart: string, currentValue: string) => void;
  onEditChange?: (value: string) => void;
  onEditSave?: () => void;
  onEditCancel?: () => void;
};

function MetricsTableBody({
  scrollRef,
  displayData,
  displayPeriods,
  visiblePeriods,
  showTotals,
  isReorderMode,
  hoveredCell,
  handleCellMouseEnter,
  handleCellMouseLeave,
  handleMetricInfoHover,
  handleMetricInfoLeave,
  handleResizeStart,
  periodHeaderRefs,
  observerRef,
  periodColWidth,
  GRIP_COL_WIDTH,
  METRIC_COL_WIDTH,
  TOTAL_COL_WIDTH,
  editable,
  editingCell,
  editInputValue,
  editSaving,
  onEditStart,
  onEditChange,
  onEditSave,
  onEditCancel,
}: MetricsTableBodyProps) {
  const shouldVirtualize = displayData.length > VIRTUALIZE_THRESHOLD && !isReorderMode;

  const virtualizer = useVirtualizer({
    count: displayData.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  const totalColCount =
    (isReorderMode ? 1 : 0) +
    1 + // metric name column
    displayPeriods.length +
    (showTotals ? 1 : 0);

  const tableWidth =
    GRIP_COL_WIDTH +
    METRIC_COL_WIDTH +
    displayPeriods.length * (periodColWidth ?? 150) +
    TOTAL_COL_WIDTH;

  const theadContent = (
    <tr className="border-b border-border-default">
      {isReorderMode && (
        <th className="sticky left-0 z-10 w-8 bg-[var(--table-bg)] py-2 pl-2" />
      )}
      <th
        className={`group/header relative sticky ${isReorderMode ? "left-8" : "left-0"} z-10 bg-[var(--table-bg)] py-2 pl-3 pr-4 text-left text-[11px] font-medium uppercase tracking-wide text-text-muted`}
        style={{ boxShadow: "4px 0 6px -4px var(--table-sticky-shadow)" }}
      >
        Metric
        {/* Resize handle */}
        <div
          onMouseDown={handleResizeStart}
          className="absolute right-0 top-0 bottom-0 w-1.5 cursor-col-resize opacity-0 transition-opacity group-hover/header:opacity-100 hover:!opacity-100"
        >
          <div className="absolute right-0 top-0 bottom-0 w-px bg-border-default" />
        </div>
      </th>
      {displayPeriods.map((period) => (
        <th
          key={period}
          data-period={period}
          ref={(el) => {
            if (el) {
              periodHeaderRefs.current.set(period, el);
              observerRef.current?.observe(el);
            } else {
              const prev = periodHeaderRefs.current.get(period);
              if (prev) observerRef.current?.unobserve(prev);
              periodHeaderRefs.current.delete(period);
            }
          }}
          className="overflow-hidden px-3 py-2 text-right text-[11px] font-medium uppercase tracking-wide text-text-muted"
        >
          <span className="block truncate whitespace-nowrap">
            {formatPeriod(period, displayData[0]?.periodType ?? "quarterly")}
          </span>
        </th>
      ))}
      {showTotals && (
        <th
          className="sticky right-0 z-10 bg-[var(--table-bg)] py-2 px-3 text-right text-[11px] font-medium uppercase tracking-wide text-text-muted"
          style={{ boxShadow: "-4px 0 6px -4px var(--table-sticky-shadow)" }}
        >
          <span className="inline-flex items-center justify-end gap-1">
            Total
            <TotalColumnTooltip
              periodType={displayData[0]?.periodType ?? "quarterly"}
              periodsVisible={visiblePeriods.length}
            />
          </span>
        </th>
      )}
    </tr>
  );

  if (!shouldVirtualize) {
    return (
      <div ref={scrollRef} className="overflow-x-auto rounded-lg">
        <table
          className="text-sm"
          style={{ tableLayout: "fixed", width: tableWidth }}
        >
          <colgroup>
            {isReorderMode && <col style={{ width: GRIP_COL_WIDTH }} />}
            <col style={{ width: METRIC_COL_WIDTH }} />
            {displayPeriods.map((period) => (
              <col key={period} style={{ width: periodColWidth ?? 150 }} />
            ))}
            {showTotals && <col style={{ width: TOTAL_COL_WIDTH }} />}
          </colgroup>
          <thead>{theadContent}</thead>
          <tbody>
            {displayData.map((metric, index) => (
              <SortableMetricRow
                key={metric.metricName}
                metric={metric}
                displayPeriods={displayPeriods}
                visiblePeriods={visiblePeriods}
                showTotals={showTotals}
                isReorderMode={isReorderMode}
                hoveredCell={hoveredCell}
                onCellMouseEnter={handleCellMouseEnter}
                onCellMouseLeave={handleCellMouseLeave}
                onMetricInfoHover={handleMetricInfoHover}
                onMetricInfoLeave={handleMetricInfoLeave}
                rowIndex={index}
                editable={editable}
                editingCell={editingCell}
                editInputValue={editInputValue}
                editSaving={editSaving}
                onEditStart={onEditStart}
                onEditChange={onEditChange}
                onEditSave={onEditSave}
                onEditCancel={onEditCancel}
              />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Virtualized rendering
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div ref={scrollRef} className="max-h-[600px] overflow-auto rounded-lg">
      <table
        className="text-sm"
        style={{ tableLayout: "fixed", width: tableWidth }}
      >
        <colgroup>
          {isReorderMode && <col style={{ width: GRIP_COL_WIDTH }} />}
          <col style={{ width: METRIC_COL_WIDTH }} />
          {displayPeriods.map((period) => (
            <col key={period} style={{ width: periodColWidth ?? 150 }} />
          ))}
          {showTotals && <col style={{ width: TOTAL_COL_WIDTH }} />}
        </colgroup>
        <thead className="sticky top-0 z-20 bg-[var(--table-bg)] shadow-[0_1px_0_var(--border-default)]">
          {theadContent}
        </thead>
        <tbody>
          {/* Top spacer */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <tr>
              <td
                colSpan={totalColCount}
                style={{ height: virtualItems[0].start, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const metric = displayData[virtualRow.index];
            return (
              <SortableMetricRow
                key={metric.metricName}
                metric={metric}
                displayPeriods={displayPeriods}
                visiblePeriods={visiblePeriods}
                showTotals={showTotals}
                isReorderMode={isReorderMode}
                hoveredCell={hoveredCell}
                onCellMouseEnter={handleCellMouseEnter}
                onCellMouseLeave={handleCellMouseLeave}
                onMetricInfoHover={handleMetricInfoHover}
                onMetricInfoLeave={handleMetricInfoLeave}
                rowIndex={virtualRow.index}
                editable={editable}
                editingCell={editingCell}
                editInputValue={editInputValue}
                editSaving={editSaving}
                onEditStart={onEditStart}
                onEditChange={onEditChange}
                onEditSave={onEditSave}
                onEditCancel={onEditCancel}
              />
            );
          })}
          {/* Bottom spacer */}
          {virtualItems.length > 0 && (
            <tr>
              <td
                colSpan={totalColCount}
                style={{
                  height: virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0),
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MetricsTable({
  data,
  title,
  onMetricClick,
  showTotals = true,
  onReorder,
  allowReorder = true,
  storageKey,
  onAddMetric,
  editable,
  onValueSubmit,
  headerActions,
}: MetricsTableProps) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell>(null);
  const [metricInfoTooltip, setMetricInfoTooltip] = useState<MetricInfoTooltipState>(null);

  // Inline editing state
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [editInputValue, setEditInputValue] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const metricInfoTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverMetricInfoRef = useRef(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedData, setOrderedData] = useState<MetricRow[]>(data); // Initialize with data
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverTooltipRef = useRef(false);
  const justDraggedRef = useRef(false); // Track if we just completed a drag
  const scrollRef = useRef<HTMLDivElement>(null);
  const [periodColWidth, setPeriodColWidth] = useState<number | null>(null);
  const [visiblePeriodSet, setVisiblePeriodSet] = useState<string[]>([]);
  const periodHeaderRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Resizable metric column
  const DEFAULT_METRIC_COL_WIDTH = 200;
  const MIN_METRIC_COL_WIDTH = 120;
  const MAX_METRIC_COL_WIDTH = 400;
  const [metricColWidth, setMetricColWidth] = useState(DEFAULT_METRIC_COL_WIDTH);
  const [metricColLoaded, setMetricColLoaded] = useState(!storageKey);
  const resizingRef = useRef(false);
  const resizeStartXRef = useRef(0);
  const resizeStartWidthRef = useRef(0);
  const colWidthSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const METRIC_COL_WIDTH = metricColWidth;
  const TOTAL_COL_WIDTH = showTotals ? 110 : 0;
  const GRIP_COL_WIDTH = isReorderMode ? 32 : 0;

  // Track when loading completes so effects that need scrollRef re-run
  const isTableLoading = (savedOrder === null || !metricColLoaded) && !!storageKey;

  // Load saved metric column width from preferences
  useEffect(() => {
    if (!storageKey) return;
    const prefKey = `metric_col_width.${storageKey}`;
    fetch(`/api/user/preferences?key=${encodeURIComponent(prefKey)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.value && typeof json.value === "number") {
          setMetricColWidth(Math.min(MAX_METRIC_COL_WIDTH, Math.max(MIN_METRIC_COL_WIDTH, json.value)));
        }
      })
      .catch(() => {})
      .finally(() => setMetricColLoaded(true));
  }, [storageKey]);

  // Save metric column width to preferences (debounced)
  const saveMetricColWidth = useCallback((width: number) => {
    if (!storageKey) return;
    if (colWidthSaveRef.current) clearTimeout(colWidthSaveRef.current);
    colWidthSaveRef.current = setTimeout(() => {
      const prefKey = `metric_col_width.${storageKey}`;
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: prefKey, value: width }),
      }).catch(() => {});
    }, 500);
  }, [storageKey]);

  useEffect(() => {
    return () => { if (colWidthSaveRef.current) clearTimeout(colWidthSaveRef.current); };
  }, []);

  // Column resize handler
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = true;
    resizeStartXRef.current = e.clientX;
    resizeStartWidthRef.current = metricColWidth;

    function onMouseMove(ev: MouseEvent) {
      if (!resizingRef.current) return;
      const delta = ev.clientX - resizeStartXRef.current;
      setMetricColWidth(Math.min(MAX_METRIC_COL_WIDTH, Math.max(MIN_METRIC_COL_WIDTH, resizeStartWidthRef.current + delta)));
    }

    function onMouseUp() {
      resizingRef.current = false;
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    }

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [metricColWidth]);

  // Save width whenever it changes (after load) via a separate effect
  const metricColWidthPrevRef = useRef(metricColWidth);
  useEffect(() => {
    if (!metricColLoaded) return;
    if (metricColWidth !== metricColWidthPrevRef.current) {
      metricColWidthPrevRef.current = metricColWidth;
      saveMetricColWidth(metricColWidth);
    }
  }, [metricColWidth, metricColLoaded, saveMetricColWidth]);

  // Measure container and compute period column width so exactly 4 fit
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    function measure() {
      if (!scrollRef.current) return;
      const containerWidth = scrollRef.current.clientWidth;
      const available = containerWidth - METRIC_COL_WIDTH - TOTAL_COL_WIDTH - GRIP_COL_WIDTH;
      setPeriodColWidth(Math.max(80, Math.floor(available / 4)));
    }

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [showTotals, TOTAL_COL_WIDTH, GRIP_COL_WIDTH, METRIC_COL_WIDTH, isTableLoading]);

  // Track which period columns are visible using IntersectionObserver
  // This is more reliable than scroll-event + getBoundingClientRect
  const visibleMapRef = useRef(new Map<string, boolean>());
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const leftMargin = METRIC_COL_WIDTH + GRIP_COL_WIDTH;
    const rightMargin = TOTAL_COL_WIDTH;

    // Disconnect previous observer
    observerRef.current?.disconnect();
    visibleMapRef.current.clear();

    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const period = (entry.target as HTMLElement).dataset.period;
          if (period) {
            visibleMapRef.current.set(period, entry.isIntersecting);
          }
        });

        const visible = Array.from(visibleMapRef.current.entries())
          .filter(([, v]) => v)
          .map(([p]) => p)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

        setVisiblePeriodSet(visible);
      },
      {
        root: scrollEl,
        // Shrink observable area to exclude the sticky columns
        rootMargin: `0px -${rightMargin}px 0px -${leftMargin}px`,
        threshold: 0.5,
      },
    );

    // Observe all period header elements currently in the DOM
    periodHeaderRefs.current.forEach((el) => {
      observerRef.current?.observe(el);
    });

    return () => observerRef.current?.disconnect();
  }, [METRIC_COL_WIDTH, GRIP_COL_WIDTH, TOTAL_COL_WIDTH, periodColWidth, isTableLoading]);

  // Load saved order from API on mount
  useEffect(() => {
    if (!storageKey) {
      setSavedOrder([]); // Empty array means "loaded, but no custom order"
      return;
    }

    const prefKey = getPreferenceKey(storageKey);

    fetch(`/api/user/preferences?key=${encodeURIComponent(prefKey)}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.value && Array.isArray(json.value)) {
          setSavedOrder(json.value);
        } else {
          setSavedOrder([]); // Empty array means "loaded, but no custom order"
        }
      })
      .catch(() => {
        setSavedOrder([]); // Empty array means "loaded, but no custom order"
      });
  }, [storageKey]); // Only run on mount, not when data changes

  // Apply saved order when it's loaded or when data changes
  useEffect(() => {
    // Wait for savedOrder to be loaded (non-null)
    if (savedOrder === null) return;

    // Skip if we just completed a drag - we already set orderedData in handleDragEnd
    if (justDraggedRef.current) {
      justDraggedRef.current = false;
      return;
    }

    if (savedOrder.length > 0) {
      setOrderedData(sortDataByOrder(data, savedOrder));
    } else {
      // savedOrder is empty array - use data as-is
      setOrderedData(data);
    }
  }, [data, savedOrder]);

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Save order to API immediately (no debounce — drag-end fires once per reorder)
  const saveOrderToApi = useCallback((order: string[]) => {
    if (!storageKey) return;

    const prefKey = getPreferenceKey(storageKey);
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: prefKey, value: order }),
    }).catch(() => {});
  }, [storageKey]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      // Mark that we just dragged - this prevents the effect from overwriting orderedData
      justDraggedRef.current = true;

      const oldIndex = orderedData.findIndex((item) => item.metricName === active.id);
      const newIndex = orderedData.findIndex((item) => item.metricName === over.id);
      const newOrder = arrayMove(orderedData, oldIndex, newIndex);
      const newOrderNames = newOrder.map((item) => item.metricName);

      // Update local state
      setOrderedData(newOrder);
      setSavedOrder(newOrderNames);

      // Save to API
      saveOrderToApi(newOrderNames);

      // Notify parent of new order
      onReorder?.(newOrderNames);
    }
  }, [orderedData, onReorder, saveOrderToApi]);

  // Use orderedData for rendering
  const displayData = orderedData;

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Auto-scroll to most recent periods (rightmost) on data load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [displayData]);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const scheduleHide = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      if (!isOverTooltipRef.current) {
        setHoveredCell(null);
      }
    }, 150);
  }, [clearHoverTimeout]);

  const handleCellMouseEnter = useCallback(
    (metricName: string, periodStart: string, cellEl: HTMLTableCellElement) => {
      // Don't switch cells if user is interacting with tooltip
      if (isOverTooltipRef.current) return;

      clearHoverTimeout();
      const rect = cellEl.getBoundingClientRect();
      setHoveredCell({ metricName, periodStart, rect });
    },
    [clearHoverTimeout],
  );

  const handleCellMouseLeave = useCallback(() => {
    scheduleHide();
  }, [scheduleHide]);

  const handleTooltipMouseEnter = useCallback(() => {
    isOverTooltipRef.current = true;
    clearHoverTimeout();
  }, [clearHoverTimeout]);

  const handleTooltipMouseLeave = useCallback(() => {
    isOverTooltipRef.current = false;
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    return () => clearHoverTimeout();
  }, [clearHoverTimeout]);

  // Metric info tooltip handlers
  const handleMetricInfoHover = useCallback(
    (metricName: string, periodType: string, rect: DOMRect) => {
      if (metricInfoTimeoutRef.current) {
        clearTimeout(metricInfoTimeoutRef.current);
        metricInfoTimeoutRef.current = null;
      }
      setMetricInfoTooltip({ metricName, periodType, rect });
    },
    [],
  );

  const scheduleMetricInfoHide = useCallback(() => {
    if (metricInfoTimeoutRef.current) {
      clearTimeout(metricInfoTimeoutRef.current);
    }
    metricInfoTimeoutRef.current = setTimeout(() => {
      if (!isOverMetricInfoRef.current) {
        setMetricInfoTooltip(null);
      }
    }, 150);
  }, []);

  const handleMetricInfoLeave = useCallback(() => {
    scheduleMetricInfoHide();
  }, [scheduleMetricInfoHide]);

  const handleMetricTooltipMouseEnter = useCallback(() => {
    isOverMetricInfoRef.current = true;
    if (metricInfoTimeoutRef.current) {
      clearTimeout(metricInfoTimeoutRef.current);
      metricInfoTimeoutRef.current = null;
    }
  }, []);

  const handleMetricTooltipMouseLeave = useCallback(() => {
    isOverMetricInfoRef.current = false;
    scheduleMetricInfoHide();
  }, [scheduleMetricInfoHide]);

  const handleMetricTooltipClose = useCallback(() => {
    isOverMetricInfoRef.current = false;
    setMetricInfoTooltip(null);
  }, []);

  useEffect(() => {
    return () => {
      if (metricInfoTimeoutRef.current) {
        clearTimeout(metricInfoTimeoutRef.current);
      }
    };
  }, []);

  // Inline edit handlers
  const handleEditStart = useCallback(
    (metricName: string, periodStart: string, currentValue: string) => {
      setEditingCell({ metricName, periodStart });
      setEditInputValue(currentValue);
      // Clear hover tooltip when editing starts
      setHoveredCell(null);
      // Open the side panel for context
      onMetricClick?.(metricName, periodStart);
    },
    [onMetricClick],
  );

  const handleEditChange = useCallback((value: string) => {
    setEditInputValue(value);
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingCell || !onValueSubmit) return;

    const trimmed = editInputValue.trim();
    if (!trimmed) {
      setEditingCell(null);
      return;
    }
    if (isNaN(Number(trimmed))) {
      // Invalid — just cancel
      setEditingCell(null);
      return;
    }

    // Find the period end from the metric data
    const metric = data.find((m) => m.metricName === editingCell.metricName);
    const periodData = metric?.periods.find((p) => p.periodStart === editingCell.periodStart);
    const periodEnd = periodData?.periodEnd ?? editingCell.periodStart;
    const periodType = metric?.periodType ?? "quarterly";

    setEditSaving(true);
    const success = await onValueSubmit(
      editingCell.metricName,
      editingCell.periodStart,
      periodEnd,
      periodType,
      trimmed,
    );
    setEditSaving(false);

    if (success) {
      setEditingCell(null);
    }
  }, [editingCell, editInputValue, onValueSubmit, data]);

  const handleEditCancel = useCallback(() => {
    if (editSaving) return;
    setEditingCell(null);
  }, [editSaving]);

  // Get all unique periods across metrics, sorted chronologically
  const sortedPeriods = useMemo(() => {
    const allPeriods = new Set<string>();
    displayData.forEach((metric) => {
      metric.periods.forEach((p) => allPeriods.add(p.periodStart));
    });
    return Array.from(allPeriods).sort(
      (a, b) => new Date(a).getTime() - new Date(b).getTime(),
    );
  }, [displayData]);

  // Ensure minimum columns so the table feels complete:
  //   monthly  → 12 months
  //   yearly   → 5 years
  const displayPeriods = useMemo(() => {
    const pType = displayData[0]?.periodType ?? "quarterly";
    const minPeriods = pType === "monthly" ? 12 : pType === "yearly" ? 5 : 0;

    if (minPeriods > 0 && sortedPeriods.length < minPeriods) {
      // Use latest data period or current date as anchor
      const anchor = sortedPeriods.length > 0
        ? new Date(sortedPeriods[sortedPeriods.length - 1])
        : new Date();
      const periodsSet = new Set(sortedPeriods);
      // Fill backwards from anchor until we reach minPeriods
      for (let i = 0; periodsSet.size < minPeriods; i++) {
        const d = pType === "monthly"
          ? new Date(anchor.getFullYear(), anchor.getMonth() - i, 1)
          : new Date(anchor.getFullYear() - i, 0, 1);
        const iso = d.toISOString().slice(0, 10);
        periodsSet.add(iso);
      }
      return Array.from(periodsSet).sort(
        (a, b) => new Date(a).getTime() - new Date(b).getTime(),
      );
    }
    return sortedPeriods;
  }, [displayData, sortedPeriods]);

  // The periods currently visible in the scroll viewport (for totals)
  // Default to last 4 periods before scroll tracking kicks in (matches auto-scroll-right)
  const visiblePeriods = useMemo(
    () =>
      visiblePeriodSet.length > 0
        ? visiblePeriodSet
        : sortedPeriods.slice(Math.max(0, sortedPeriods.length - 4)),
    [visiblePeriodSet, sortedPeriods],
  );

  // Find the period data for the hovered cell
  const hoveredPeriodData = useMemo(
    () =>
      hoveredCell
        ? displayData
            .find((m) => m.metricName === hoveredCell.metricName)
            ?.periods.find((p) => p.periodStart === hoveredCell.periodStart)
        : null,
    [hoveredCell, displayData],
  );

  // Show loading state while preferences are being fetched
  // This prevents flash of unsorted content on page load
  if ((savedOrder === null || !metricColLoaded) && storageKey) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-border-default border-t-text-tertiary" />
      </div>
    );
  }

  if (!displayData.length) {
    return (
      <div className="flex h-full items-center justify-center text-text-tertiary">
        No data available
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      {title && (
        <h3 className="mb-2 text-sm font-medium text-text-primary">{title}</h3>
      )}

      {/* Toolbar */}
      <div data-no-print className="mb-4 flex items-center justify-between">
        <div className="text-xs tabular-nums text-text-muted">
          {sortedPeriods.length} period{sortedPeriods.length !== 1 ? "s" : ""}
        </div>
        <div className="flex items-center gap-2">
          {allowReorder && (
            <button
            type="button"
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors ${
              isReorderMode
                ? "border-[var(--tag-blue-text)] bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]"
                : "border-border-subtle text-text-muted hover:border-border-default hover:text-text-tertiary"
            }`}
            title={isReorderMode ? "Exit reorder mode" : "Reorder metrics"}
          >
            <ArrowUpDown className="h-3 w-3" />
            {isReorderMode ? "Done" : "Reorder"}
          </button>
          )}
          {headerActions}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={displayData.map((m) => m.metricName)}
          strategy={verticalListSortingStrategy}
        >
          <MetricsTableBody
            scrollRef={scrollRef}
            displayData={displayData}
            displayPeriods={displayPeriods}
            visiblePeriods={visiblePeriods}
            showTotals={showTotals}
            isReorderMode={isReorderMode}
            hoveredCell={hoveredCell}
            handleCellMouseEnter={handleCellMouseEnter}
            handleCellMouseLeave={handleCellMouseLeave}
            handleMetricInfoHover={handleMetricInfoHover}
            handleMetricInfoLeave={handleMetricInfoLeave}
            handleResizeStart={handleResizeStart}
            periodHeaderRefs={periodHeaderRefs}
            observerRef={observerRef}
            periodColWidth={periodColWidth}
            GRIP_COL_WIDTH={GRIP_COL_WIDTH}
            METRIC_COL_WIDTH={METRIC_COL_WIDTH}
            TOTAL_COL_WIDTH={TOTAL_COL_WIDTH}
            editable={editable}
            editingCell={editingCell}
            editInputValue={editInputValue}
            editSaving={editSaving}
            onEditStart={handleEditStart}
            onEditChange={handleEditChange}
            onEditSave={handleEditSave}
            onEditCancel={handleEditCancel}
          />
        </SortableContext>
      </DndContext>

      {onAddMetric && (
        <button
          type="button"
          data-no-print
          onClick={onAddMetric}
          className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
        >
          <Plus className="h-4 w-4" />
          Add Metric
        </button>
      )}

      {/* Render cell tooltip via portal */}
      {mounted && hoveredCell && hoveredPeriodData && (
        <CellTooltip
          periodData={hoveredPeriodData}
          cellRect={hoveredCell.rect}
          onViewDetails={() => {
            isOverTooltipRef.current = false;
            setHoveredCell(null);
            onMetricClick?.(hoveredCell.metricName, hoveredCell.periodStart);
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}

      {/* Render metric definition tooltip via portal */}
      {mounted && metricInfoTooltip && (
        <MetricNameTooltip
          metricName={metricInfoTooltip.metricName}
          periodType={metricInfoTooltip.periodType}
          triggerRect={metricInfoTooltip.rect}
          onClose={handleMetricTooltipClose}
          onMouseEnter={handleMetricTooltipMouseEnter}
          onMouseLeave={handleMetricTooltipMouseLeave}
        />
      )}
    </div>
  );
}

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatValue, formatPeriod } from "@/components/charts/types";
import { Sparkles, PenLine, RotateCcw, Info, GripVertical, ArrowUpDown } from "lucide-react";
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

type PeriodData = {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  source?: string;
  aiConfidence?: number | null;
  submittedAt?: string;
  updatedAt?: string;
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
  onMetricClick?: (metricName: string) => void;
  /** Show the Total column (default: true) */
  showTotals?: boolean;
  /** Callback when metrics are reordered */
  onReorder?: (metricNames: string[]) => void;
  /** Allow reordering (default: true) */
  allowReorder?: boolean;
  /** Storage key for persisting metric order (e.g., "metrics-order-{companyId}") */
  storageKey?: string;
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
      className="z-[100] w-56 rounded-lg border border-white/10 bg-zinc-900 p-3 shadow-xl"
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
          <span className="text-white/60">Source</span>
          <span
            className={`rounded px-1.5 py-0.5 font-medium ${
              isAi
                ? "bg-violet-500/20 text-violet-300"
                : periodData.source === "override"
                  ? "bg-amber-500/20 text-amber-300"
                  : "bg-zinc-500/20 text-zinc-300"
            }`}
          >
            {formatSourceLabel(periodData.source)}
          </span>
        </div>

        {isAi && periodData.aiConfidence != null && (
          <div className="flex items-center justify-between">
            <span className="text-white/60">Confidence</span>
            <span className="text-white/80">
              {Math.round(periodData.aiConfidence * 100)}%
            </span>
          </div>
        )}

        {displayDate && (
          <div className="flex items-center justify-between">
            <span className="text-white/60">Last updated</span>
            <span className="text-white/80">{formatDate(displayDate)}</span>
          </div>
        )}

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onViewDetails();
          }}
          className="mt-1 w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-center text-xs font-medium text-white/80 hover:bg-white/10"
        >
          View details
        </button>
      </div>
    </div>,
    document.body
  );
}

type SortableMetricRowProps = {
  metric: MetricRow;
  displayPeriods: string[];
  visiblePeriods: string[];
  showTotals: boolean;
  isReorderMode: boolean;
  hoveredCell: HoveredCell;
  onCellMouseEnter: (metricName: string, periodStart: string, cellEl: HTMLTableCellElement) => void;
  onCellMouseLeave: () => void;
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
}: SortableMetricRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: metric.metricName });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isAiExtracted = metric.source === "ai_extracted";

  // Determine aggregation type for total
  const aggregationType = metric.aggregationType ?? getDefaultAggregationType(metric.metricName);
  const { symbol: aggSymbol } = getAggregationIndicator(aggregationType);

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`border-b border-white/5 ${isDragging ? "bg-white/5" : ""}`}
    >
      {isReorderMode && (
        <td className="sticky left-0 z-10 w-8 bg-zinc-950 py-2">
          <button
            type="button"
            className="flex h-6 w-6 cursor-grab items-center justify-center rounded text-white/40 hover:bg-white/10 hover:text-white/60 active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        </td>
      )}
      <td
        className={`sticky ${isReorderMode ? "left-8" : "left-0"} z-10 bg-zinc-950 py-2 pr-4`}
        style={{ boxShadow: "4px 0 8px -4px rgba(0,0,0,0.4)" }}
      >
        <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-white/80">
          {isAiExtracted && (
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          )}
          {metric.metricName}
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

        // Color-coded cell background based on source
        const cellBgColor =
          periodData?.source === "ai_extracted"
            ? "bg-violet-500/10"
            : periodData?.source === "override"
              ? "bg-amber-500/10"
              : "";

        return (
          <td
            key={period}
            className={`px-3 py-2 text-right font-mono ${cellBgColor} ${
              hasData
                ? "cursor-default rounded transition-colors hover:bg-white/10"
                : ""
            } ${isHovered ? "bg-white/10" : ""}`}
            onMouseEnter={
              hasData && !isReorderMode
                ? (e) =>
                    onCellMouseEnter(
                      metric.metricName,
                      period,
                      e.currentTarget,
                    )
                : undefined
            }
            onMouseLeave={hasData && !isReorderMode ? onCellMouseLeave : undefined}
          >
            {periodData
              ? formatValue(periodData.value, metric.metricName)
              : "—"}
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
            className="sticky right-0 z-10 min-w-[72px] bg-zinc-950 py-2 px-2 text-right font-mono"
            style={{ boxShadow: "-4px 0 8px -4px rgba(0,0,0,0.4)" }}
          >
            {total !== null ? (
              <span className="text-white/90" title={`${aggSymbol} ${aggregationType === "sum" ? "Sum" : "Latest"}`}>
                {formatValue(total, metric.metricName)}
              </span>
            ) : (
              "—"
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
        className="text-white/40 hover:text-white/60"
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {isOpen && pos && createPortal(
        <div
          className="fixed z-[100] w-64 rounded-lg border border-white/10 bg-zinc-900 p-3 text-xs shadow-xl"
          style={{ top: pos.top, right: pos.right }}
          onMouseEnter={() => setIsOpen(true)}
          onMouseLeave={() => setIsOpen(false)}
        >
          <p className="font-medium text-white/90">Total</p>
          <p className="mt-1 text-white/60">
            Calculated across the {periodsVisible} visible {periodLabel}. Updates as you scroll.
          </p>
          <div className="mt-2 space-y-1.5 border-t border-white/10 pt-2 text-white/60">
            <p><span className="text-white/80">Σ Flow metrics</span> (Revenue, Expenses) are summed.</p>
            <p><span className="text-white/80">● Point-in-time metrics</span> (ARR, Burn Rate) show the most recent value.</p>
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

export function MetricsTable({
  data,
  title,
  onMetricClick,
  showTotals = true,
  onReorder,
  allowReorder = true,
  storageKey,
}: MetricsTableProps) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell>(null);
  const [mounted, setMounted] = useState(false);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const [orderedData, setOrderedData] = useState<MetricRow[]>(data); // Initialize with data
  const [savedOrder, setSavedOrder] = useState<string[] | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverTooltipRef = useRef(false);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justDraggedRef = useRef(false); // Track if we just completed a drag
  const scrollRef = useRef<HTMLDivElement>(null);
  const metricColRef = useRef<HTMLTableCellElement>(null);
  const [periodColWidth, setPeriodColWidth] = useState<number | null>(null);
  const [visiblePeriodSet, setVisiblePeriodSet] = useState<string[]>([]);
  const periodHeaderRefs = useRef<Map<string, HTMLTableCellElement>>(new Map());

  // Measure container and compute period column width so exactly 4 fit
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    function measure() {
      if (!scrollRef.current) return;
      const containerWidth = scrollRef.current.clientWidth;
      // Measure the actual metric name column width, fallback to 180
      const metricWidth = metricColRef.current?.offsetWidth ?? 180;
      const totalColWidth = showTotals ? 80 : 0;
      const available = containerWidth - metricWidth - totalColWidth;
      setPeriodColWidth(Math.max(100, Math.floor(available / 4)));
    }

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(scrollEl);
    return () => observer.disconnect();
  }, [showTotals]);

  // Determine which period headers are actually visible between the sticky columns
  const updateVisiblePeriods = useCallback(() => {
    if (!scrollRef.current || !metricColRef.current) return;
    const scrollRect = scrollRef.current.getBoundingClientRect();
    const metricColW = metricColRef.current.offsetWidth;
    const totalColW = showTotals ? 80 : 0;

    // The visible period area is between the two sticky columns
    const visibleLeft = scrollRect.left + metricColW;
    const visibleRight = scrollRect.right - totalColW;

    const visible: string[] = [];
    periodHeaderRefs.current.forEach((el, period) => {
      const rect = el.getBoundingClientRect();
      const center = rect.left + rect.width / 2;
      if (center >= visibleLeft && center <= visibleRight) {
        visible.push(period);
      }
    });

    // Sort chronologically
    visible.sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    setVisiblePeriodSet(visible);
  }, [showTotals]);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    scrollEl.addEventListener("scroll", updateVisiblePeriods, { passive: true });
    return () => scrollEl.removeEventListener("scroll", updateVisiblePeriods);
  }, [updateVisiblePeriods]);

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

  // Save order to API (debounced)
  const saveOrderToApi = useCallback((order: string[]) => {
    if (!storageKey) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(() => {
      const prefKey = getPreferenceKey(storageKey);
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: prefKey, value: order }),
      }).catch(() => {
        // Silently fail - the order is still saved in local state
      });
    }, 500);
  }, [storageKey]);

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

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

  // Calculate source counts for summary
  const sourceCounts = useMemo(() => {
    let ai = 0,
      manual = 0,
      override = 0;
    displayData.forEach((metric) => {
      metric.periods.forEach((p) => {
        if (p.value != null) {
          if (p.source === "ai_extracted") ai++;
          else if (p.source === "override") override++;
          else manual++;
        }
      });
    });
    return { ai, manual, override, total: ai + manual + override };
  }, [displayData]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Auto-scroll to most recent periods (rightmost) on data load
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
      // Update visible periods after scrolling settles
      requestAnimationFrame(() => updateVisiblePeriods());
    }
  }, [displayData, updateVisiblePeriods]);

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

  // Show loading state while preferences are being fetched
  // This prevents flash of unsorted content on page load
  if (savedOrder === null && storageKey) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
      </div>
    );
  }

  if (!displayData.length) {
    return (
      <div className="flex h-full items-center justify-center text-white/60">
        No data available
      </div>
    );
  }

  // Get all unique periods across metrics
  const allPeriods = new Set<string>();
  displayData.forEach((metric) => {
    metric.periods.forEach((p) => allPeriods.add(p.periodStart));
  });

  const sortedPeriods = Array.from(allPeriods).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime(),
  );

  // All periods are displayed — user scrolls horizontally
  const displayPeriods = sortedPeriods;

  // The periods currently visible in the scroll viewport (for totals)
  // Default to last 4 periods before scroll tracking kicks in (matches auto-scroll-right)
  const visiblePeriods = visiblePeriodSet.length > 0
    ? visiblePeriodSet
    : sortedPeriods.slice(Math.max(0, sortedPeriods.length - 4));

  // Find the period data for the hovered cell
  const hoveredPeriodData = hoveredCell
    ? displayData
        .find((m) => m.metricName === hoveredCell.metricName)
        ?.periods.find((p) => p.periodStart === hoveredCell.periodStart)
    : null;

  return (
    <div className="flex h-full flex-col">
      {title && (
        <h3 className="mb-3 text-sm font-medium text-white/80">{title}</h3>
      )}

      {/* Source summary */}
      {sourceCounts.total > 0 && (
        <div className="mb-3">
          <div className="flex items-center gap-4 text-xs text-white/60">
            {sourceCounts.ai > 0 && (
              <span className="flex items-center gap-1.5 text-violet-300">
                <Sparkles className="h-3 w-3" />
                {sourceCounts.ai} AI-extracted
              </span>
            )}
            {sourceCounts.manual > 0 && (
              <span className="flex items-center gap-1.5">
                <PenLine className="h-3 w-3" />
                {sourceCounts.manual} Manual
              </span>
            )}
            {sourceCounts.override > 0 && (
              <span className="flex items-center gap-1.5 text-amber-300">
                <RotateCcw className="h-3 w-3" />
                {sourceCounts.override} Override
              </span>
            )}
            <span className="ml-auto text-white/60">
              {sourceCounts.total} values
            </span>
          </div>

          {/* Segmented progress bar */}
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
            <div className="flex h-full">
              {sourceCounts.ai > 0 && (
                <div
                  className="bg-violet-500/60"
                  style={{
                    width: `${(sourceCounts.ai / sourceCounts.total) * 100}%`,
                  }}
                />
              )}
              {sourceCounts.manual > 0 && (
                <div
                  className="bg-white/30"
                  style={{
                    width: `${(sourceCounts.manual / sourceCounts.total) * 100}%`,
                  }}
                />
              )}
              {sourceCounts.override > 0 && (
                <div
                  className="bg-amber-500/60"
                  style={{
                    width: `${(sourceCounts.override / sourceCounts.total) * 100}%`,
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-3">
        <div className="text-xs text-white/60">
          {sortedPeriods.length} period{sortedPeriods.length !== 1 ? "s" : ""}
        </div>
        {allowReorder && (
          <button
            type="button"
            onClick={() => setIsReorderMode(!isReorderMode)}
            className={`flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors ${
              isReorderMode
                ? "border-blue-500/50 bg-blue-500/20 text-blue-300"
                : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10"
            }`}
            title={isReorderMode ? "Exit reorder mode" : "Reorder metrics"}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            {isReorderMode ? "Done" : "Reorder"}
          </button>
        )}
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
          <div ref={scrollRef} className="overflow-x-auto">
            <table className="text-sm" style={{ tableLayout: "fixed" }}>
              <colgroup>
                {isReorderMode && <col style={{ width: 32 }} />}
                <col style={{ width: "auto" }} />
                {displayPeriods.map((period) => (
                  <col key={period} style={{ width: periodColWidth ?? 150 }} />
                ))}
                {showTotals && <col style={{ width: 80 }} />}
              </colgroup>
              <thead>
                <tr className="border-b border-white/10">
                  {isReorderMode && (
                    <th className="sticky left-0 z-10 w-8 bg-zinc-950 pb-2" />
                  )}
                  <th
                    ref={metricColRef}
                    className={`sticky ${isReorderMode ? "left-8" : "left-0"} z-10 bg-zinc-950 pb-2 pr-4 text-left font-medium text-white/60`}
                    style={{ boxShadow: "4px 0 8px -4px rgba(0,0,0,0.4)" }}
                  >
                    Metric
                  </th>
                  {displayPeriods.map((period) => (
                    <th
                      key={period}
                      ref={(el) => {
                        if (el) periodHeaderRefs.current.set(period, el);
                        else periodHeaderRefs.current.delete(period);
                      }}
                      className="px-3 pb-2 text-right font-medium text-white/60"
                    >
                      {formatPeriod(period, displayData[0]?.periodType ?? "quarterly")}
                    </th>
                  ))}
                  {showTotals && (
                    <th
                      className="sticky right-0 z-10 bg-zinc-950 pb-2 px-2 text-right font-medium text-white/60"
                      style={{ boxShadow: "-4px 0 8px -4px rgba(0,0,0,0.4)" }}
                    >
                      <span className="inline-flex items-center gap-1">
                        <TotalColumnTooltip
                          periodType={displayData[0]?.periodType ?? "quarterly"}
                          periodsVisible={visiblePeriods.length}
                        />
                      </span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {displayData.map((metric) => (
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
                  />
                ))}
              </tbody>
            </table>
          </div>
        </SortableContext>
      </DndContext>

      {/* Render tooltip via portal */}
      {mounted && hoveredCell && hoveredPeriodData && (
        <CellTooltip
          periodData={hoveredPeriodData}
          cellRect={hoveredCell.rect}
          onViewDetails={() => {
            isOverTooltipRef.current = false;
            setHoveredCell(null);
            onMetricClick?.(hoveredCell.metricName);
          }}
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        />
      )}
    </div>
  );
}

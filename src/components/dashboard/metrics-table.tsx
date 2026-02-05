"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { formatValue, formatPeriod } from "@/components/charts/types";
import { Sparkles, PenLine, RotateCcw, ChevronLeft, ChevronRight } from "lucide-react";

type PeriodData = {
  periodStart: string;
  periodEnd: string;
  value: number | null;
  source?: string;
  aiConfidence?: number | null;
  submittedAt?: string;
  updatedAt?: string;
};

type MetricsTableProps = {
  data: Array<{
    metricName: string;
    periodType: string;
    source?: string;
    aiConfidence?: number | null;
    periods: PeriodData[];
  }>;
  title?: string;
  onMetricClick?: (metricName: string) => void;
  /** Number of periods to show per page (default: 4) */
  periodsPerPage?: number;
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
          <span className="text-white/50">Source</span>
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
            <span className="text-white/50">Confidence</span>
            <span className="text-white/80">
              {Math.round(periodData.aiConfidence * 100)}%
            </span>
          </div>
        )}

        {displayDate && (
          <div className="flex items-center justify-between">
            <span className="text-white/50">Last updated</span>
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

export function MetricsTable({ data, title, onMetricClick, periodsPerPage = 4 }: MetricsTableProps) {
  const [hoveredCell, setHoveredCell] = useState<HoveredCell>(null);
  const [mounted, setMounted] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isOverTooltipRef = useRef(false);

  // Calculate source counts for summary
  const sourceCounts = useMemo(() => {
    let ai = 0,
      manual = 0,
      override = 0;
    data.forEach((metric) => {
      metric.periods.forEach((p) => {
        if (p.value != null) {
          if (p.source === "ai_extracted") ai++;
          else if (p.source === "override") override++;
          else manual++;
        }
      });
    });
    return { ai, manual, override, total: ai + manual + override };
  }, [data]);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  // Reset page when data changes
  useEffect(() => {
    setCurrentPage(0);
  }, [data]);

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

  if (!data.length) {
    return (
      <div className="flex h-full items-center justify-center text-white/40">
        No data available
      </div>
    );
  }

  // Get all unique periods across metrics
  const allPeriods = new Set<string>();
  data.forEach((metric) => {
    metric.periods.forEach((p) => allPeriods.add(p.periodStart));
  });

  const sortedPeriods = Array.from(allPeriods).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  // Pagination
  const totalPages = Math.ceil(sortedPeriods.length / periodsPerPage);
  const startIndex = currentPage * periodsPerPage;
  const displayPeriods = sortedPeriods.slice(startIndex, startIndex + periodsPerPage);
  const hasPrevPage = currentPage > 0;
  const hasNextPage = currentPage < totalPages - 1;

  // Find the period data for the hovered cell
  const hoveredPeriodData = hoveredCell
    ? data
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
            <span className="ml-auto text-white/40">
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

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="mb-3 flex items-center justify-between">
          <div className="text-xs text-white/40">
            Showing periods {startIndex + 1}–{Math.min(startIndex + periodsPerPage, sortedPeriods.length)} of {sortedPeriods.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={!hasPrevPage}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20"
              title="Previous periods"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-white/50">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={!hasNextPage}
              className="flex h-7 w-7 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white/60 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-white/20"
              title="Next periods"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="pb-2 text-left font-medium text-white/60">
                Metric
              </th>
              {displayPeriods.map((period) => (
                <th
                  key={period}
                  className="pb-2 text-right font-medium text-white/60"
                >
                  {formatPeriod(period, data[0]?.periodType ?? "quarterly")}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((metric) => {
              const isAiExtracted = metric.source === "ai_extracted";
              return (
                <tr
                  key={metric.metricName}
                  className="border-b border-white/5"
                >
                  <td className="py-2">
                    <span className="inline-flex items-center gap-1.5 text-white/80">
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
                        className={`py-2 text-right font-mono ${cellBgColor} ${
                          hasData
                            ? "cursor-default rounded transition-colors hover:bg-white/10"
                            : ""
                        } ${isHovered ? "bg-white/10" : ""}`}
                        onMouseEnter={
                          hasData
                            ? (e) =>
                                handleCellMouseEnter(
                                  metric.metricName,
                                  period,
                                  e.currentTarget,
                                )
                            : undefined
                        }
                        onMouseLeave={hasData ? handleCellMouseLeave : undefined}
                      >
                        {periodData
                          ? formatValue(periodData.value, metric.metricName)
                          : "—"}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

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

"use client";

import * as React from "react";
import {
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Check,
  Pencil,
  Calendar,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatValue, formatPeriod } from "@/components/charts/types";
import { getNumericValue } from "@/components/dashboard/types";
import { useChartTheme } from "@/hooks/use-chart-theme";
import { SourceBadge } from "./source-badge";
import { MetricHistoryTimeline } from "./metric-history-timeline";
import { MetricCommentThread } from "./metric-comment-thread";

type MetricValue = {
  id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: unknown;
  notes: string | null;
  source: string;
  source_document_id: string | null;
  ai_confidence: number | null;
  submitted_at: string;
};

type HistoryEntry = {
  id: string;
  metric_value_id: string;
  previous_value: { raw?: string } | null;
  new_value: { raw?: string } | null;
  previous_source: string | null;
  new_source: string | null;
  changed_by: string | null;
  changed_by_name?: string | null;
  change_reason: string | null;
  created_at: string;
};

type LinkedDocument = {
  id: string;
  file_name: string;
  document_type: string;
};

/** Extract a string representation of a metric value for editing/display */
function getValueString(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const v = obj.raw ?? obj.value;
    if (v != null) return String(v);
  }
  return "";
}

type Props = {
  companyId: string;
  metricName: string;
  onClose: () => void;
  editable?: boolean; // true for founders
  onValueUpdated?: () => void;
  /** Optional initial period to select (period_start string). Defaults to most recent. */
  initialPeriod?: string;
};

export function MetricDetailPanel({
  companyId,
  metricName,
  onClose,
  editable = false,
  onValueUpdated,
  initialPeriod,
}: Props) {
  const chartTheme = useChartTheme();
  const [loading, setLoading] = React.useState(true);
  const [values, setValues] = React.useState<MetricValue[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [documents, setDocuments] = React.useState<LinkedDocument[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [historyExpanded, setHistoryExpanded] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);
  const [periodDropdownOpen, setPeriodDropdownOpen] = React.useState(false);

  // Selected period index (into the values array). -1 means "not yet initialized"
  const [selectedPeriodIndex, setSelectedPeriodIndex] = React.useState(-1);

  // Edit state
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const [editReason, setEditReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const contentRef = React.useRef<HTMLDivElement>(null);
  const periodDropdownRef = React.useRef<HTMLDivElement>(null);
  // Delay chart rendering until the panel slide-in animation is complete
  // so that ResponsiveContainer can correctly measure its parent dimensions.
  const [chartReady, setChartReady] = React.useState(false);

  // Animate in
  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
    const timer = setTimeout(() => setChartReady(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const panelRef = React.useRef<HTMLDivElement>(null);

  // Scroll to the top of the side panel when it opens or metric/period changes.
  // Uses the panel's parent element (the dashboard content area) as the scroll target
  // so the page scrolls to the dashboard — not the very top of the page.
  React.useEffect(() => {
    panelRef.current?.parentElement?.scrollIntoView({ behavior: "smooth", block: "start" });
    contentRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    panelRef.current?.focus({ preventScroll: true });
  }, [metricName, initialPeriod]);

  // Escape to close
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }

  // Close period dropdown on outside click
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        periodDropdownRef.current &&
        !periodDropdownRef.current.contains(e.target as Node)
      ) {
        setPeriodDropdownOpen(false);
      }
    }
    if (periodDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [periodDropdownOpen]);

  // Fetch data with abort support to prevent state updates on unmounted component
  React.useEffect(() => {
    const controller = new AbortController();

    async function load() {
      try {
        const res = await fetch(
          `/api/metrics/detail?companyId=${encodeURIComponent(companyId)}&metricName=${encodeURIComponent(metricName)}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error ?? "Failed to load metric details.");
        }
        const json = await res.json();
        if (controller.signal.aborted) return;

        const loadedValues: MetricValue[] = json.values ?? [];
        setValues(loadedValues);
        setHistory(json.history ?? []);
        setDocuments(json.documents ?? []);

        // Initialize selected period
        if (initialPeriod && loadedValues.length > 0) {
          const idx = loadedValues.findIndex(
            (v) => v.period_start === initialPeriod,
          );
          setSelectedPeriodIndex(idx >= 0 ? idx : loadedValues.length - 1);
        } else {
          setSelectedPeriodIndex(
            loadedValues.length > 0 ? loadedValues.length - 1 : 0,
          );
        }
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();

    return () => controller.abort();
  }, [companyId, metricName, initialPeriod]);

  // Compute chart data
  const chartData = React.useMemo(() => {
    return values.map((v) => {
      return {
        period: formatPeriod(v.period_start, v.period_type),
        periodStart: v.period_start,
        value: getNumericValue(v.value),
      };
    });
  }, [values]);

  // Selected period value (from dropdown, defaults to most recent)
  const safeIndex =
    selectedPeriodIndex >= 0 && selectedPeriodIndex < values.length
      ? selectedPeriodIndex
      : values.length - 1;
  const current = values.length > 0 ? values[safeIndex] : null;
  const previous = safeIndex > 0 ? values[safeIndex - 1] : null;

  const currentNum = current ? getNumericValue(current.value) : null;
  const previousNum = previous ? getNumericValue(previous.value) : null;

  const percentChange =
    currentNum != null && previousNum != null && previousNum !== 0
      ? ((currentNum - previousNum) / Math.abs(previousNum)) * 100
      : null;

  // Period label for the selected value
  const selectedPeriodLabel = current
    ? formatPeriod(current.period_start, current.period_type)
    : null;

  async function handleSubmitOverride() {
    if (!current || !editValue.trim()) return;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/metrics/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          metricName,
          periodType: current.period_type,
          periodStart: current.period_start,
          periodEnd: current.period_end,
          value: editValue.trim(),
          source: "override",
          changeReason: editReason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to update metric.");
      }

      // Refresh data (maintain selected period)
      const refreshRes = await fetch(
        `/api/metrics/detail?companyId=${encodeURIComponent(companyId)}&metricName=${encodeURIComponent(metricName)}`,
      );
      const refreshJson = await refreshRes.json();
      const refreshedValues: MetricValue[] = refreshJson.values ?? [];
      setValues(refreshedValues);
      setHistory(refreshJson.history ?? []);

      // Re-find the selected period in refreshed data
      if (current) {
        const newIdx = refreshedValues.findIndex(
          (v) => v.period_start === current.period_start,
        );
        if (newIdx >= 0) setSelectedPeriodIndex(newIdx);
      }

      setEditing(false);
      setEditValue("");
      setEditReason("");
      onValueUpdated?.();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const changeBadgeColor =
    percentChange != null && percentChange > 0
      ? "bg-[var(--success-bg-subtle)] text-[var(--success-accent)] ring-1 ring-inset ring-[var(--success-ring)]"
      : percentChange != null && percentChange < 0
        ? "bg-red-500/10 text-red-400 ring-1 ring-inset ring-red-500/25"
        : "bg-bg-elevated text-text-muted ring-1 ring-inset ring-border-default";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-bg-backdrop backdrop-blur-sm transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        tabIndex={-1}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-bg-primary shadow-2xl transition-transform duration-300 ease-out sm:w-[520px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-detail-title"
      >
        {/* Left edge — layered glow effect */}
        <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-gradient-to-b from-[var(--tag-blue-bg)] via-transparent to-transparent opacity-60 blur-md" />
        <div className="absolute left-0 top-0 bottom-0 w-[2px] bg-gradient-to-b from-[var(--tag-blue-text)] via-border-default to-transparent opacity-50" />
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border-default" />

        {/* Header */}
        <div className="relative px-8 pt-9 pb-8">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-7 top-7 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-raised text-text-muted transition-all duration-200 hover:border-border-default hover:bg-bg-hover hover:text-text-primary active:scale-95"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          {/* Metric label */}
          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
            Metric Detail
          </span>

          <h2
            id="metric-detail-title"
            className="mt-3 pr-12 text-[22px] font-semibold leading-tight tracking-tight text-text-primary"
          >
            {metricName}
          </h2>

          {/* Period selector */}
          {values.length > 0 && selectedPeriodLabel && (
            <div ref={periodDropdownRef} className="relative mt-3">
              <button
                type="button"
                onClick={() => setPeriodDropdownOpen((p) => !p)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
                    e.preventDefault();
                    if (!periodDropdownOpen) setPeriodDropdownOpen(true);
                  }
                }}
                className="inline-flex items-center gap-2 rounded-lg border border-border-subtle bg-bg-raised px-3 py-1.5 text-[13px] text-text-secondary transition-all duration-200 hover:border-border-default hover:bg-bg-hover hover:text-text-primary"
                aria-haspopup="listbox"
                aria-expanded={periodDropdownOpen}
              >
                <Calendar className="h-3.5 w-3.5 text-text-muted" aria-hidden="true" />
                <span className="tabular-nums">{selectedPeriodLabel}</span>
                <ChevronDown
                  className={`h-3 w-3 text-text-muted transition-transform duration-150 ${periodDropdownOpen ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
              {periodDropdownOpen && (
                <div
                  role="listbox"
                  className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-56 overflow-y-auto rounded-xl border border-border-subtle bg-bg-secondary py-1 shadow-xl"
                >
                  {[...values].reverse().map((v, revIdx) => {
                    const realIdx = values.length - 1 - revIdx;
                    const label = formatPeriod(v.period_start, v.period_type);
                    const isSelected = realIdx === safeIndex;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => {
                          setSelectedPeriodIndex(realIdx);
                          setPeriodDropdownOpen(false);
                          setEditing(false);
                        }}
                        className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-[13px] transition-colors ${
                          isSelected
                            ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)]"
                            : "text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary"
                        }`}
                      >
                        <span className="tabular-nums">{label}</span>
                        {getNumericValue(v.value) != null && (
                          <span className="ml-2 font-mono text-[11px] text-text-faint tabular-nums">
                            {formatValue(getNumericValue(v.value)!, metricName)}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {currentNum != null && (
            <div className="mt-5 flex items-baseline gap-4">
              <span className="text-[34px] font-bold leading-none tabular-nums tracking-tight text-text-primary">
                {formatValue(currentNum, metricName)}
              </span>
              {percentChange != null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium tabular-nums ${changeBadgeColor}`}
                >
                  {percentChange > 0 ? (
                    <TrendingUp className="h-3.5 w-3.5" />
                  ) : percentChange < 0 ? (
                    <TrendingDown className="h-3.5" />
                  ) : (
                    <Minus className="h-3.5 w-3.5" />
                  )}
                  {percentChange > 0 ? "+" : ""}
                  {percentChange.toFixed(1)}%
                </span>
              )}
            </div>
          )}

          {/* Accent line under header */}
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-border-default to-transparent" />
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Loader2 className="h-5 w-5 animate-spin text-[var(--tag-blue-text)]" />
              <span className="text-xs text-text-faint">Loading details</span>
            </div>
          )}

          {error && (
            <div className="mx-8 mt-6 rounded-xl border border-red-500/15 bg-red-500/5 px-4 py-3 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          {!loading && values.length === 0 && (
            <div className="px-8 py-20 text-center text-sm text-text-faint">
              No data available for this metric.
            </div>
          )}

          {!loading && values.length > 0 && (
            <div className="space-y-8 px-8 pt-8 pb-12">
              {/* Trend Chart */}
              {chartData.length > 1 && (
                <section>
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
                    Trend
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-raised">
                    <div className="p-5">
                      {chartReady ? (
                        <ResponsiveContainer width="100%" height={180}>
                          <RechartsLineChart
                            data={chartData}
                            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke={chartTheme.grid}
                              vertical={false}
                            />
                            <XAxis
                              dataKey="period"
                              tick={{ fill: chartTheme.tick, fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                            />
                            <YAxis
                              tick={{ fill: chartTheme.tick, fontSize: 10 }}
                              tickLine={false}
                              axisLine={false}
                              tickFormatter={(v) => formatValue(v, metricName)}
                              width={65}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: chartTheme.tooltipBg,
                                border: `1px solid ${chartTheme.tooltipBorder}`,
                                borderRadius: "12px",
                                color: chartTheme.tooltipText,
                                padding: "10px 14px",
                                fontSize: "12px",
                                boxShadow: `0 12px 40px ${chartTheme.tooltipShadow}`,
                              }}
                              formatter={(v) => [
                                formatValue(v as number, metricName),
                                metricName,
                              ]}
                            />
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke="#3b82f6"
                              strokeWidth={2.5}
                              dot={{ fill: "#3b82f6", strokeWidth: 2, stroke: chartTheme.tooltipBg, r: 4 }}
                              activeDot={{ r: 6, fill: "#3b82f6", stroke: "rgba(59,130,246,0.3)", strokeWidth: 3 }}
                              connectNulls
                            />
                          </RechartsLineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex h-[180px] items-center justify-center">
                          <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* Source Info */}
              {current && (
                <section>
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
                    Source
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-raised">
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <SourceBadge
                          source={current.source}
                          confidence={current.ai_confidence}
                        />
                        <span className="text-[11px] tabular-nums text-text-muted">
                          {new Date(current.submitted_at).toLocaleDateString(
                            "en-US",
                            {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            },
                          )}
                        </span>
                      </div>
                      {current.source_document_id && (
                        <div className="mt-3 flex items-center gap-2.5 rounded-lg border border-border-subtle bg-bg-elevated/50 px-3 py-2.5 text-xs text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary">
                          <FileText className="h-3.5 w-3.5 shrink-0 text-text-faint" />
                          <span className="truncate">
                            {documents.find(
                              (d) => d.id === current.source_document_id,
                            )?.file_name ?? "Linked document"}
                          </span>
                        </div>
                      )}
                      {current.notes && (
                        <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-muted italic">
                          {current.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* AI Resolution (founder only, when source is ai_extracted) */}
              {editable && current && current.source === "ai_extracted" && (
                <section>
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
                    Review AI Extraction
                  </h3>
                  <div className="overflow-hidden rounded-xl border border-[var(--tag-violet-bg)] bg-[var(--tag-violet-bg)]">
                    <div className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--tag-violet-bg)] ring-1 ring-inset ring-[var(--tag-violet-bg)]">
                          <Sparkles className="h-4 w-4 text-[var(--tag-violet-text)]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-[var(--tag-violet-text)]">
                            AI-extracted value
                            {current.ai_confidence != null && (
                              <span className="ml-2 text-xs font-normal text-text-muted">
                                {Math.round(current.ai_confidence * 100)}% confidence
                              </span>
                            )}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-text-muted">
                            Confirm this value is correct, or correct it with the right number.
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <button
                          type="button"
                          onClick={async () => {
                            setConfirming(true);
                            setError(null);
                            try {
                              const res = await fetch("/api/metrics/submit", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  companyId,
                                  metricName,
                                  periodType: current.period_type,
                                  periodStart: current.period_start,
                                  periodEnd: current.period_end,
                                  value: getValueString(current.value),
                                  source: "override",
                                  changeReason: "Confirmed AI-extracted value",
                                }),
                              });
                              if (!res.ok) {
                                const json = await res.json().catch(() => null);
                                throw new Error(json?.error ?? "Failed to confirm.");
                              }
                              const refreshRes = await fetch(
                                `/api/metrics/detail?companyId=${encodeURIComponent(companyId)}&metricName=${encodeURIComponent(metricName)}`,
                              );
                              const refreshJson = await refreshRes.json();
                              const rv: MetricValue[] = refreshJson.values ?? [];
                              setValues(rv);
                              setHistory(refreshJson.history ?? []);
                              if (current) {
                                const ni = rv.findIndex(
                                  (v) => v.period_start === current.period_start,
                                );
                                if (ni >= 0) setSelectedPeriodIndex(ni);
                              }
                              onValueUpdated?.();
                            } catch (err: unknown) {
                              setError(err instanceof Error ? err.message : "Something went wrong.");
                            } finally {
                              setConfirming(false);
                            }
                          }}
                          disabled={confirming || submitting}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[var(--success-solid)] px-4 text-xs font-medium text-white shadow-sm shadow-emerald-900/30 transition-all duration-200 hover:bg-[var(--success-solid)] hover:shadow-emerald-900/40 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[var(--success-ring)] focus:ring-offset-1 focus:ring-offset-bg-primary"
                        >
                          <Check className="h-3.5 w-3.5" />
                          {confirming ? "Confirming..." : "Confirm value"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditValue(getValueString(current.value));
                            setEditing(true);
                          }}
                          disabled={confirming || submitting}
                          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-subtle bg-bg-raised px-3.5 text-xs text-text-tertiary transition-colors hover:bg-bg-elevated hover:text-text-secondary disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-ring-focus focus:ring-offset-1 focus:ring-offset-bg-primary"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Correct value
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {/* Edit (founder only) */}
              {editable && current && (
                <section>
                  <h3 className="mb-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
                    Edit Value
                  </h3>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditValue(getValueString(current.value));
                        setEditing(true);
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-border-subtle bg-bg-raised px-4 text-sm text-text-tertiary transition-all duration-200 hover:border-border-default hover:bg-bg-hover hover:text-text-secondary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Override current value
                    </button>
                  ) : (
                    <div className="overflow-hidden rounded-xl border border-border-subtle bg-bg-raised">
                      <div className="space-y-4 p-5">
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                            New Value
                          </label>
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="mt-1.5 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm font-mono text-text-primary outline-none transition-colors hover:border-border-default focus:border-border-default focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                            Reason (optional)
                          </label>
                          <input
                            type="text"
                            value={editReason}
                            onChange={(e) => setEditReason(e.target.value)}
                            placeholder="e.g., Corrected from Q4 report"
                            className="mt-1.5 h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-faint hover:border-border-default focus:border-border-default focus:outline-none"
                          />
                        </div>
                        <div className="flex gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => setEditing(false)}
                            className="h-8 rounded-lg border border-border-subtle bg-bg-raised px-3.5 text-xs text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSubmitOverride}
                            disabled={submitting || !editValue.trim()}
                            className="h-9 rounded-lg bg-btn-primary-bg px-4 text-xs font-medium text-btn-primary-text shadow-sm transition-all duration-200 hover:bg-btn-primary-hover hover:shadow-md disabled:opacity-50"
                          >
                            {submitting ? "Saving..." : "Save override"}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </section>
              )}

              {/* Activity Log */}
              <section>
                <button
                  type="button"
                  onClick={() => setHistoryExpanded((p) => !p)}
                  className="group flex w-full items-center justify-between py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint transition-colors hover:text-text-tertiary"
                >
                  <span>Activity Log ({history.length})</span>
                  <div className="flex h-6 w-6 items-center justify-center rounded-md border border-transparent bg-bg-raised transition-all duration-200 group-hover:border-border-subtle group-hover:bg-bg-hover">
                    {historyExpanded ? (
                      <ChevronUp className="h-3 w-3" />
                    ) : (
                      <ChevronDown className="h-3 w-3" />
                    )}
                  </div>
                </button>
                {historyExpanded && (
                  <div className="mt-4">
                    <MetricHistoryTimeline history={history} />
                  </div>
                )}
              </section>

              {/* Comment Thread */}
              <section className="rounded-lg border border-border-subtle overflow-hidden">
                <MetricCommentThread companyId={companyId} metricName={metricName} />
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

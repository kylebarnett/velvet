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
import { SourceBadge } from "./source-badge";
import { MetricHistoryTimeline } from "./metric-history-timeline";

type MetricValue = {
  id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: { raw?: string } | null;
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

  // Animate in
  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Scroll page to top so the fixed panel is fully visible
  React.useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [metricName]);

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

  // Fetch data
  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/metrics/detail?companyId=${encodeURIComponent(companyId)}&metricName=${encodeURIComponent(metricName)}`,
        );
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          throw new Error(json?.error ?? "Failed to load metric details.");
        }
        const json = await res.json();
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
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, metricName, initialPeriod]);

  // Compute chart data
  const chartData = React.useMemo(() => {
    return values.map((v) => {
      const raw = v.value && typeof v.value === "object" ? v.value.raw : null;
      const numValue = raw != null ? parseFloat(raw) : null;
      return {
        period: formatPeriod(v.period_start, v.period_type),
        periodStart: v.period_start,
        value: isNaN(numValue as number) ? null : numValue,
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

  const currentNum = current?.value?.raw ? parseFloat(current.value.raw) : null;
  const previousNum = previous?.value?.raw ? parseFloat(previous.value.raw) : null;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  const changeBadgeColor =
    percentChange != null && percentChange > 0
      ? "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20"
      : percentChange != null && percentChange < 0
        ? "bg-red-500/10 text-red-400 ring-1 ring-red-500/20"
        : "bg-white/5 text-white/40 ring-1 ring-white/10";

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-md transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col bg-zinc-950 shadow-2xl transition-transform duration-300 ease-out sm:w-[500px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-detail-title"
      >
        {/* Left edge glow line */}
        <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-blue-500/40 via-blue-500/10 to-transparent" />

        {/* Header */}
        <div className="relative px-7 pt-7 pb-6">
          {/* Close button */}
          <button
            onClick={handleClose}
            className="absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/50 transition-all duration-150 hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Metric label */}
          <span className="text-[11px] font-medium uppercase tracking-widest text-white/40">
            Metric Detail
          </span>

          <h2
            id="metric-detail-title"
            className="mt-2 text-xl font-semibold tracking-tight text-white"
          >
            {metricName}
          </h2>

          {/* Period selector */}
          {values.length > 0 && selectedPeriodLabel && (
            <div ref={periodDropdownRef} className="relative mt-2.5">
              <button
                type="button"
                onClick={() => setPeriodDropdownOpen((p) => !p)}
                className="inline-flex items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-sm text-white/70 transition-colors hover:bg-white/[0.06] hover:text-white"
              >
                <Calendar className="h-3.5 w-3.5 text-white/40" />
                <span className="tabular-nums">{selectedPeriodLabel}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 text-white/40 transition-transform duration-150 ${periodDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {periodDropdownOpen && (
                <div className="absolute left-0 top-full z-50 mt-1.5 max-h-64 w-48 overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900 py-1 shadow-xl">
                  {[...values].reverse().map((v, revIdx) => {
                    const realIdx = values.length - 1 - revIdx;
                    const label = formatPeriod(v.period_start, v.period_type);
                    const isSelected = realIdx === safeIndex;
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedPeriodIndex(realIdx);
                          setPeriodDropdownOpen(false);
                          setEditing(false);
                        }}
                        className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-sm transition-colors ${
                          isSelected
                            ? "bg-blue-500/10 text-blue-300"
                            : "text-white/60 hover:bg-white/5 hover:text-white/80"
                        }`}
                      >
                        <span className="tabular-nums">{label}</span>
                        {v.value?.raw != null && (
                          <span className="ml-2 font-mono text-xs text-white/30 tabular-nums">
                            {formatValue(parseFloat(v.value.raw), metricName)}
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
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-3xl font-bold tabular-nums tracking-tight text-white">
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
          <div className="absolute bottom-0 left-7 right-7 h-px bg-gradient-to-r from-white/[0.08] via-white/[0.04] to-transparent" />
        </div>

        {/* Scrollable content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <Loader2 className="h-5 w-5 animate-spin text-white/30" />
              <span className="text-xs text-white/30">Loading details</span>
            </div>
          )}

          {error && (
            <div className="mx-7 mt-6 rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          )}

          {!loading && values.length === 0 && (
            <div className="px-7 py-16 text-center text-sm text-white/40">
              No data available for this metric.
            </div>
          )}

          {!loading && values.length > 0 && (
            <div className="space-y-8 px-7 py-6">
              {/* Trend Chart */}
              {chartData.length > 1 && (
                <section>
                  <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Trend
                  </h3>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                    <ResponsiveContainer width="100%" height={180}>
                      <RechartsLineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <defs>
                          <linearGradient id="metricLine" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                            <stop offset="100%" stopColor="#3b82f6" stopOpacity={1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.04)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => formatValue(v)}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(9, 9, 11, 0.95)",
                            border: "1px solid rgba(255,255,255,0.08)",
                            borderRadius: "10px",
                            color: "white",
                            padding: "8px 12px",
                            fontSize: "12px",
                            boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                          }}
                          formatter={(v) => [
                            formatValue(v as number, metricName),
                            metricName,
                          ]}
                        />
                        <Line
                          type="monotone"
                          dataKey="value"
                          stroke="url(#metricLine)"
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", strokeWidth: 0, r: 3 }}
                          activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1d4ed8", strokeWidth: 2 }}
                          connectNulls
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              )}

              {/* Source Info */}
              {current && (
                <section>
                  <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Source
                  </h3>
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <div className="flex items-center justify-between">
                      <SourceBadge
                        source={current.source}
                        confidence={current.ai_confidence}
                      />
                      <span className="text-[11px] tabular-nums text-white/35">
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
                      <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/[0.03] px-3 py-2 text-xs text-white/50">
                        <FileText className="h-3.5 w-3.5 shrink-0 text-white/30" />
                        <span className="truncate">
                          {documents.find(
                            (d) => d.id === current.source_document_id,
                          )?.file_name ?? "Linked document"}
                        </span>
                      </div>
                    )}
                    {current.notes && (
                      <p className="mt-3 border-t border-white/[0.04] pt-3 text-xs leading-relaxed text-white/50 italic">
                        {current.notes}
                      </p>
                    )}
                  </div>
                </section>
              )}

              {/* AI Resolution (founder only, when source is ai_extracted) */}
              {editable && current && current.source === "ai_extracted" && (
                <section>
                  <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Review AI Extraction
                  </h3>
                  <div className="rounded-xl border border-violet-500/15 bg-violet-500/[0.04] p-5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                        <Sparkles className="h-4 w-4 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-violet-200">
                          AI-extracted value
                          {current.ai_confidence != null && (
                            <span className="ml-2 text-xs font-normal text-violet-300/60">
                              {Math.round(current.ai_confidence * 100)}% confidence
                            </span>
                          )}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-white/45">
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
                                value: current.value?.raw ?? "",
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
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Something went wrong.");
                          } finally {
                            setConfirming(false);
                          }
                        }}
                        disabled={confirming || submitting}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-medium text-white transition-colors hover:bg-emerald-500 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:ring-offset-1 focus:ring-offset-zinc-950"
                      >
                        <Check className="h-3.5 w-3.5" />
                        {confirming ? "Confirming..." : "Confirm value"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditValue(current.value?.raw ?? "");
                          setEditing(true);
                        }}
                        disabled={confirming || submitting}
                        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-white/15 focus:ring-offset-1 focus:ring-offset-zinc-950"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Correct value
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* Edit (founder only) */}
              {editable && current && (
                <section>
                  <h3 className="mb-4 text-[11px] font-medium uppercase tracking-widest text-white/40">
                    Edit Value
                  </h3>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditValue(current.value?.raw ?? "");
                        setEditing(true);
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Override current value
                    </button>
                  ) : (
                    <div className="space-y-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                          New Value
                        </label>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-sm font-mono text-white outline-none transition-colors focus:border-white/20 focus:ring-1 focus:ring-white/10"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-widest text-white/40">
                          Reason (optional)
                        </label>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="e.g., Corrected from Q4 report"
                          className="mt-1.5 h-10 w-full rounded-lg border border-white/[0.08] bg-black/40 px-3 text-sm text-white outline-none transition-colors placeholder:text-white/25 focus:border-white/20 focus:ring-1 focus:ring-white/10"
                        />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="h-8 rounded-lg border border-white/[0.08] bg-white/[0.03] px-3.5 text-xs text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitOverride}
                          disabled={submitting || !editValue.trim()}
                          className="h-8 rounded-lg bg-white px-3.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-white/90 disabled:opacity-50"
                        >
                          {submitting ? "Saving..." : "Save override"}
                        </button>
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
                  className="flex w-full items-center justify-between py-1 text-[11px] font-medium uppercase tracking-widest text-white/40 transition-colors hover:text-white/60"
                >
                  <span>Activity Log ({history.length})</span>
                  <div className="flex h-5 w-5 items-center justify-center rounded-md bg-white/5">
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
            </div>
          )}
        </div>
      </div>
    </>
  );
}

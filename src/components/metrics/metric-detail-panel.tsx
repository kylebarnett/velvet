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
};

export function MetricDetailPanel({
  companyId,
  metricName,
  onClose,
  editable = false,
  onValueUpdated,
}: Props) {
  const [loading, setLoading] = React.useState(true);
  const [values, setValues] = React.useState<MetricValue[]>([]);
  const [history, setHistory] = React.useState<HistoryEntry[]>([]);
  const [documents, setDocuments] = React.useState<LinkedDocument[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [isVisible, setIsVisible] = React.useState(false);
  const [historyExpanded, setHistoryExpanded] = React.useState(true);
  const [confirming, setConfirming] = React.useState(false);

  // Edit state
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState("");
  const [editReason, setEditReason] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Animate in
  React.useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

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
        setValues(json.values ?? []);
        setHistory(json.history ?? []);
        setDocuments(json.documents ?? []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [companyId, metricName]);

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

  // Current (most recent) value
  const current = values.length > 0 ? values[values.length - 1] : null;
  const previous = values.length > 1 ? values[values.length - 2] : null;

  const currentNum = current?.value?.raw ? parseFloat(current.value.raw) : null;
  const previousNum = previous?.value?.raw ? parseFloat(previous.value.raw) : null;

  const percentChange =
    currentNum != null && previousNum != null && previousNum !== 0
      ? ((currentNum - previousNum) / Math.abs(previousNum)) * 100
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

      // Refresh data
      const refreshRes = await fetch(
        `/api/metrics/detail?companyId=${encodeURIComponent(companyId)}&metricName=${encodeURIComponent(metricName)}`,
      );
      const refreshJson = await refreshRes.json();
      setValues(refreshJson.values ?? []);
      setHistory(refreshJson.history ?? []);

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-zinc-900 shadow-2xl transition-transform duration-200 sm:w-[480px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="metric-detail-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-6">
          <div>
            <h2
              id="metric-detail-title"
              className="text-lg font-semibold text-white"
            >
              {metricName}
            </h2>
            {currentNum != null && (
              <div className="mt-1 flex items-center gap-3">
                <span className="text-2xl font-bold text-white">
                  {formatValue(currentNum, metricName)}
                </span>
                {percentChange != null && (
                  <span
                    className={`flex items-center gap-0.5 text-sm ${
                      percentChange > 0
                        ? "text-emerald-400"
                        : percentChange < 0
                          ? "text-red-400"
                          : "text-white/40"
                    }`}
                  >
                    {percentChange > 0 ? (
                      <TrendingUp className="h-4 w-4" />
                    ) : percentChange < 0 ? (
                      <TrendingDown className="h-4 w-4" />
                    ) : (
                      <Minus className="h-4 w-4" />
                    )}
                    {percentChange > 0 ? "+" : ""}
                    {percentChange.toFixed(1)}%
                  </span>
                )}
              </div>
            )}
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          )}

          {error && (
            <div className="m-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {!loading && values.length === 0 && (
            <div className="p-6 text-center text-sm text-white/60">
              No data available for this metric.
            </div>
          )}

          {!loading && values.length > 0 && (
            <div className="space-y-6 p-6">
              {/* Trend Chart */}
              {chartData.length > 1 && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
                    Trend
                  </h3>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <RechartsLineChart
                        data={chartData}
                        margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="rgba(255,255,255,0.1)"
                        />
                        <XAxis
                          dataKey="period"
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                          tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                        />
                        <YAxis
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                          tickLine={{ stroke: "rgba(255,255,255,0.2)" }}
                          axisLine={{ stroke: "rgba(255,255,255,0.2)" }}
                          tickFormatter={(v) => formatValue(v)}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: "rgba(24, 24, 27, 0.95)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: "8px",
                            color: "white",
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
                          strokeWidth={2}
                          dot={{ fill: "#3b82f6", strokeWidth: 0, r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      </RechartsLineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Source Info */}
              {current && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
                    Source
                  </h3>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2">
                      <SourceBadge
                        source={current.source}
                        confidence={current.ai_confidence}
                      />
                      <span className="text-xs text-white/60">
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
                      <div className="mt-2 flex items-center gap-1.5 text-xs text-white/60">
                        <FileText className="h-3.5 w-3.5" />
                        {documents.find(
                          (d) => d.id === current.source_document_id,
                        )?.file_name ?? "Linked document"}
                      </div>
                    )}
                    {current.notes && (
                      <p className="mt-2 text-xs text-white/60 italic">
                        {current.notes}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* AI Resolution (founder only, when source is ai_extracted) */}
              {editable && current && current.source === "ai_extracted" && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
                    Review AI Extraction
                  </h3>
                  <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                    <div className="flex items-center gap-2 text-sm text-violet-200">
                      <Sparkles className="h-4 w-4 text-violet-400" />
                      <span>
                        This value was extracted by AI
                        {current.ai_confidence != null && (
                          <> with {Math.round(current.ai_confidence * 100)}% confidence</>
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-white/60">
                      Confirm this value is correct, or correct it with the right number.
                    </p>
                    <div className="mt-3 flex gap-2">
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
                            setValues(refreshJson.values ?? []);
                            setHistory(refreshJson.history ?? []);
                            onValueUpdated?.();
                          } catch (err) {
                            setError(err instanceof Error ? err.message : "Something went wrong.");
                          } finally {
                            setConfirming(false);
                          }
                        }}
                        disabled={confirming || submitting}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md bg-emerald-600 px-3 text-xs font-medium text-white hover:bg-emerald-500 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
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
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Correct value
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Edit (founder only) */}
              {editable && current && (
                <div>
                  <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/60">
                    Edit Value
                  </h3>
                  {!editing ? (
                    <button
                      type="button"
                      onClick={() => {
                        setEditValue(current.value?.raw ?? "");
                        setEditing(true);
                      }}
                      className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white/70 hover:bg-white/10"
                    >
                      Override current value
                    </button>
                  ) : (
                    <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                      <div>
                        <label className="text-[10px] text-white/60 uppercase tracking-wider">
                          New Value
                        </label>
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm font-mono outline-none focus:border-white/20"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-white/60 uppercase tracking-wider">
                          Reason (optional)
                        </label>
                        <input
                          type="text"
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="e.g., Corrected from Q4 report"
                          className="mt-1 h-9 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditing(false)}
                          className="h-8 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/60 hover:bg-white/10"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSubmitOverride}
                          disabled={submitting || !editValue.trim()}
                          className="h-8 rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-60"
                        >
                          {submitting ? "Saving..." : "Save override"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Activity Log */}
              <div>
                <button
                  type="button"
                  onClick={() => setHistoryExpanded((p) => !p)}
                  className="flex w-full items-center justify-between text-xs font-medium uppercase tracking-wider text-white/40 hover:text-white/60"
                >
                  <span>Activity Log ({history.length})</span>
                  {historyExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                </button>
                {historyExpanded && (
                  <div className="mt-3">
                    <MetricHistoryTimeline history={history} />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

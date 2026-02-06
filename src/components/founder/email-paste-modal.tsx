"use client";

import * as React from "react";
import { Loader2, Mail, CheckCircle2, X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatValue } from "@/components/charts/types";

type ExtractedMetric = {
  name: string;
  value: number | string;
  unit: string | null;
  period_type: string;
  period_start: string;
  period_end: string;
  confidence: number;
  page_number: number | null;
  context: string | null;
};

type ModalState = "idle" | "extracting" | "reviewing" | "saving" | "done";

interface EmailPasteModalProps {
  open: boolean;
  companyId: string;
  onClose: () => void;
  onMetricsSaved?: () => void;
}

function formatPeriodLabel(periodStart: string, periodType: string): string {
  const date = new Date(periodStart + "T00:00:00");
  if (periodType === "monthly") {
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  }
  if (periodType === "quarterly") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  }
  if (periodType === "annual") {
    return String(date.getFullYear());
  }
  return periodStart;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-emerald-300";
  if (confidence >= 0.5) return "text-amber-300";
  return "text-red-300";
}

export function EmailPasteModal({
  open,
  companyId,
  onClose,
  onMetricsSaved,
}: EmailPasteModalProps) {
  const [state, setState] = React.useState<ModalState>("idle");
  const [emailContent, setEmailContent] = React.useState("");
  const [metrics, setMetrics] = React.useState<ExtractedMetric[]>([]);
  const [selected, setSelected] = React.useState<Set<number>>(new Set());
  const [error, setError] = React.useState<string | null>(null);
  const [savedCount, setSavedCount] = React.useState(0);
  const [providerInfo, setProviderInfo] = React.useState<string | null>(null);

  // Escape key handler
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && state !== "extracting" && state !== "saving") {
        handleClose();
      }
    }
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [open, state]);

  function handleClose() {
    setState("idle");
    setEmailContent("");
    setMetrics([]);
    setSelected(new Set());
    setError(null);
    setSavedCount(0);
    setProviderInfo(null);
    onClose();
  }

  async function handleExtract() {
    if (!emailContent.trim() || emailContent.trim().length < 10) {
      setError("Please paste email content (at least 10 characters).");
      return;
    }

    setState("extracting");
    setError(null);

    try {
      const res = await fetch("/api/founder/email-ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: emailContent,
          companyId,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Extraction failed." }));
        throw new Error(data.error || "Extraction failed.");
      }

      const data = await res.json();
      const extractedMetrics: ExtractedMetric[] = data.metrics || [];

      if (extractedMetrics.length === 0) {
        setError("No financial metrics found in the email content. Try pasting a different email.");
        setState("idle");
        return;
      }

      setMetrics(extractedMetrics);
      // Select all metrics by default
      setSelected(new Set(extractedMetrics.map((_, i) => i)));
      setProviderInfo(data.provider ? `${data.provider}` : null);
      setState("reviewing");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Extraction failed.";
      setError(message);
      setState("idle");
    }
  }

  async function handleSave() {
    const selectedMetrics = metrics.filter((_, i) => selected.has(i));
    if (selectedMetrics.length === 0) {
      setError("Please select at least one metric to save.");
      return;
    }

    setState("saving");
    setError(null);

    try {
      const submissions = selectedMetrics.map((m) => ({
        metricName: m.name,
        periodType: m.period_type as "monthly" | "quarterly" | "annual",
        periodStart: m.period_start,
        periodEnd: m.period_end,
        value: String(m.value),
        source: "ai_extracted" as const,
      }));

      const res = await fetch("/api/metrics/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          submissions,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Save failed." }));
        throw new Error(data.error || "Failed to save metrics.");
      }

      const data = await res.json();
      setSavedCount(data.submitted || 0);
      setState("done");

      if (data.submitted > 0) {
        onMetricsSaved?.();
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Save failed.";
      setError(message);
      setState("reviewing");
    }
  }

  function toggleMetric(index: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === metrics.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(metrics.map((_, i) => i)));
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && state !== "extracting" && state !== "saving") {
          handleClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Import from Email"
    >
      <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-zinc-50">
              <Mail className="h-5 w-5 text-white/70" />
              Import from Email
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Paste your investor update email content to automatically extract
              metrics.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={state === "extracting" || state === "saving"}
            className="rounded-md p-1 text-white/40 hover:text-white/70 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div
            className="mb-4 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        )}

        {/* Idle: Textarea for pasting email */}
        {state === "idle" && (
          <div className="space-y-4">
            <div>
              <textarea
                value={emailContent}
                onChange={(e) => setEmailContent(e.target.value)}
                placeholder="Paste your investor update email here..."
                className="min-h-[300px] w-full resize-y rounded-md border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-zinc-50 placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
              <p className="mt-1 text-xs text-white/40">
                {emailContent.length.toLocaleString()} / 50,000 characters
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExtract}
                disabled={!emailContent.trim()}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                Extract Metrics
              </button>
            </div>
          </div>
        )}

        {/* Extracting: Loading state */}
        {state === "extracting" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <p className="mt-4 text-sm text-white/60">
              Extracting metrics from email...
            </p>
            <p className="mt-1 text-xs text-white/40">
              This may take a few seconds.
            </p>
          </div>
        )}

        {/* Reviewing: Show extracted metrics for selection */}
        {state === "reviewing" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/70">
                Found{" "}
                <span className="font-medium text-zinc-50">
                  {metrics.length}
                </span>{" "}
                metric{metrics.length !== 1 ? "s" : ""}.
                {providerInfo && (
                  <span className="ml-2 text-white/40">
                    via {providerInfo}
                  </span>
                )}
              </p>
              <button
                type="button"
                onClick={toggleAll}
                className="text-xs text-white/50 hover:text-white/80"
              >
                {selected.size === metrics.length
                  ? "Deselect all"
                  : "Select all"}
              </button>
            </div>

            {/* Metrics list */}
            <div className="max-h-[360px] space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-1">
              {metrics.map((metric, index) => (
                <label
                  key={index}
                  className={cn(
                    "flex cursor-pointer items-start gap-3 rounded-lg p-3 transition-colors",
                    selected.has(index)
                      ? "bg-white/5"
                      : "opacity-50 hover:opacity-75",
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selected.has(index)}
                    onChange={() => toggleMetric(index)}
                    className="mt-0.5 h-4 w-4 rounded border-white/20 bg-black/30 text-white accent-white"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-zinc-50">
                        {metric.name}
                      </span>
                      <span className="whitespace-nowrap text-sm font-semibold text-zinc-50">
                        {formatValue(
                          typeof metric.value === "string"
                            ? parseFloat(metric.value)
                            : metric.value,
                          metric.name,
                        )}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
                      <span>
                        {formatPeriodLabel(
                          metric.period_start,
                          metric.period_type,
                        )}
                      </span>
                      <span className="text-white/20">|</span>
                      <span className={confidenceColor(metric.confidence)}>
                        {Math.round(metric.confidence * 100)}% confidence
                      </span>
                    </div>
                    {metric.context && (
                      <p className="mt-1 line-clamp-2 text-xs text-white/30 italic">
                        &quot;{metric.context}&quot;
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  setState("idle");
                  setMetrics([]);
                  setSelected(new Set());
                }}
                className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
              >
                Back
              </button>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handleClose}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={selected.size === 0}
                  className="flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-50"
                >
                  Save {selected.size} Metric{selected.size !== 1 ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Saving: Loading state */}
        {state === "saving" && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-white/60" />
            <p className="mt-4 text-sm text-white/60">
              Saving metrics...
            </p>
          </div>
        )}

        {/* Done: Success state */}
        {state === "done" && (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20">
              <CheckCircle2 className="h-6 w-6 text-emerald-300" />
            </div>
            <p className="mt-4 text-sm font-medium text-zinc-50">
              {savedCount} metric{savedCount !== 1 ? "s" : ""} saved
              successfully
            </p>
            <p className="mt-1 text-xs text-white/50">
              Your dashboard will update to reflect the new data.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 rounded-lg bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/90"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

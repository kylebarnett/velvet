"use client";

import * as React from "react";
import { X, Sparkles, Loader2, CheckCircle2, FileText } from "lucide-react";
import { ExtractedMetricRow } from "./extracted-metric-row";

type ExtractionMapping = {
  id: string;
  extracted_metric_name: string;
  extracted_value: { raw?: string; unit?: string } | null;
  extracted_period_start: string;
  extracted_period_end: string;
  extracted_period_type: string;
  confidence_score: number | null;
  status: string;
};

type Props = {
  documentId: string;
  documentName: string;
  onClose: () => void;
  onMetricsAccepted?: () => void;
};

export function ExtractionReviewPanel({
  documentId,
  documentName,
  onClose,
  onMetricsAccepted,
}: Props) {
  const [status, setStatus] = React.useState<string>("loading");
  const [mappings, setMappings] = React.useState<ExtractionMapping[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [processing, setProcessing] = React.useState(false);
  const [isVisible, setIsVisible] = React.useState(false);

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

  // Poll extraction status
  React.useEffect(() => {
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | null = null;

    async function poll() {
      try {
        const res = await fetch(`/api/documents/${documentId}/extraction-status`);
        if (!res.ok) throw new Error("Failed to fetch extraction status.");
        const json = await res.json();
        if (cancelled) return;

        setStatus(json.status);
        setMappings(json.mappings ?? []);

        // Stop polling only when extraction is done (completed or failed)
        if ((json.status === "completed" || json.status === "failed") && interval) {
          clearInterval(interval);
          interval = null;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong.");
        }
      }
    }

    poll();
    interval = setInterval(poll, 3000);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
    };
  }, [documentId]);

  // Start extraction if document is pending — fire and forget,
  // let polling pick up the completed/failed status
  React.useEffect(() => {
    if (status !== "pending") return;

    setStatus("processing");

    fetch(`/api/documents/${documentId}/ingest`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          const json = await res.json().catch(() => null);
          console.error("[extraction] Ingest failed:", json?.error);
        }
      })
      .catch((err) => {
        console.error("[extraction] Ingest request error:", err);
      });
    // Polling (above) will detect when status changes to completed/failed
  }, [status, documentId]);

  async function handleAccept(
    mappingId: string,
    overrides?: {
      metricName?: string;
      value?: string;
      periodType?: string;
      periodStart?: string;
      periodEnd?: string;
    },
  ) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/extraction-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, action: "accept", ...overrides }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to accept metric.");
      }
      setMappings((prev) =>
        prev.map((m) => (m.id === mappingId ? { ...m, status: "accepted" } : m)),
      );
      onMetricsAccepted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject(mappingId: string) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/extraction-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, action: "reject" }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to reject metric.");
      }
      setMappings((prev) =>
        prev.map((m) => (m.id === mappingId ? { ...m, status: "rejected" } : m)),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  async function handleAcceptAll() {
    const pending = mappings.filter((m) => m.status === "pending");
    for (const m of pending) {
      await handleAccept(m.id);
    }
  }

  async function handleRejectAll() {
    const pending = mappings.filter((m) => m.status === "pending");
    for (const m of pending) {
      await handleReject(m.id);
    }
  }

  async function handleUpdate(
    mappingId: string,
    updates: {
      metricName?: string;
      value?: string;
      periodStart?: string;
      periodEnd?: string;
    },
  ) {
    setProcessing(true);
    try {
      const res = await fetch(`/api/documents/${documentId}/extraction-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappingId, action: "update", ...updates }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to update metric.");
      }
      // Refresh mappings to get updated data
      const statusRes = await fetch(`/api/documents/${documentId}/extraction-status`);
      if (statusRes.ok) {
        const json = await statusRes.json();
        setMappings(json.mappings ?? []);
      }
      onMetricsAccepted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setProcessing(false);
    }
  }

  const pendingCount = mappings.filter((m) => m.status === "pending").length;
  const acceptedCount = mappings.filter((m) => m.status === "accepted").length;
  const rejectedCount = mappings.filter((m) => m.status === "rejected").length;

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
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-white/10 bg-zinc-900 shadow-2xl transition-transform duration-200 sm:w-[520px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extraction-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 p-5">
          <div className="min-w-0 flex-1">
            <h2
              id="extraction-title"
              className="flex items-center gap-2 text-base font-semibold text-white"
            >
              <Sparkles className="h-5 w-5 text-violet-400" />
              AI Extraction Review
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-white/60">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{documentName}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status bar */}
        {status === "completed" && mappings.length > 0 && (
          <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
            <div className="flex items-center gap-3 text-xs">
              {pendingCount > 0 && (
                <span className="text-white/60">{pendingCount} pending</span>
              )}
              {acceptedCount > 0 && (
                <span className="text-emerald-300">{acceptedCount} accepted</span>
              )}
              {rejectedCount > 0 && (
                <span className="text-red-300">{rejectedCount} rejected</span>
              )}
            </div>
            {pendingCount > 0 && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  disabled={processing}
                  className="h-7 rounded-md border border-white/10 bg-white/5 px-2.5 text-xs text-white/60 hover:bg-white/10 disabled:opacity-40"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  disabled={processing}
                  className="h-7 rounded-md bg-emerald-500/20 px-2.5 text-xs font-medium text-emerald-200 hover:bg-emerald-500/30 disabled:opacity-40"
                >
                  Accept all
                </button>
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-4 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}

          {(status === "loading" || status === "processing") && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-violet-400" />
              <p className="text-sm text-white/60">
                {status === "loading"
                  ? "Loading extraction results..."
                  : "Extracting metrics from document..."}
              </p>
              <p className="text-xs text-white/40">
                This may take a moment for large documents.
              </p>
            </div>
          )}

          {status === "failed" && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="rounded-full bg-red-500/10 p-3">
                <Sparkles className="h-6 w-6 text-red-400" />
              </div>
              <p className="text-sm text-white/60">Extraction failed.</p>
              <p className="text-xs text-white/40">
                The document may not contain recognizable financial data.
              </p>
            </div>
          )}

          {status === "completed" && mappings.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="rounded-full bg-white/5 p-3">
                <Sparkles className="h-6 w-6 text-white/30" />
              </div>
              <p className="text-sm text-white/60">No metrics found.</p>
              <p className="text-xs text-white/40">
                No financial metrics could be extracted from this document.
              </p>
            </div>
          )}

          {status === "completed" && mappings.length > 0 && (
            <div className="space-y-2">
              {mappings.map((mapping) => (
                <ExtractedMetricRow
                  key={mapping.id}
                  mapping={mapping}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  onUpdate={handleUpdate}
                  disabled={processing}
                />
              ))}
            </div>
          )}

          {status === "completed" && pendingCount === 0 && mappings.length > 0 && (
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              <p className="text-sm text-emerald-200">
                All metrics reviewed. {acceptedCount} accepted, {rejectedCount} rejected.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

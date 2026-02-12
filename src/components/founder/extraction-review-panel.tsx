"use client";

import * as React from "react";
import { X, Sparkles, Loader2, CheckCircle2, FileText } from "lucide-react";
import { ExtractedMetricRow } from "./extracted-metric-row";
import { logger } from "@/lib/logger";

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
      } catch (err: unknown) {
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
          logger.error("[extraction] Ingest failed:", json?.error);
        }
      })
      .catch((err) => {
        logger.error("[extraction] Ingest request error:", err);
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
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
        className={`fixed inset-0 z-40 bg-bg-sidebar backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border-default bg-bg-secondary shadow-2xl transition-transform duration-200 sm:w-[520px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="extraction-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default p-5">
          <div className="min-w-0 flex-1">
            <h2
              id="extraction-title"
              className="flex items-center gap-2 text-base font-semibold text-text-primary"
            >
              <Sparkles className="h-5 w-5 text-[var(--violet-accent)]" />
              AI Extraction Review
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-text-tertiary">
              <FileText className="h-3.5 w-3.5" />
              <span className="truncate">{documentName}</span>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Status bar */}
        {status === "completed" && mappings.length > 0 && (
          <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
            <div className="flex items-center gap-3 text-xs">
              {pendingCount > 0 && (
                <span className="text-text-tertiary">{pendingCount} pending</span>
              )}
              {acceptedCount > 0 && (
                <span className="text-[var(--status-success-text)]">{acceptedCount} accepted</span>
              )}
              {rejectedCount > 0 && (
                <span className="text-[var(--status-error-text)]">{rejectedCount} rejected</span>
              )}
            </div>
            {pendingCount > 0 && (
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={handleRejectAll}
                  disabled={processing}
                  className="h-7 rounded-md border border-border-default bg-bg-elevated px-2.5 text-xs text-text-tertiary hover:bg-bg-hover disabled:opacity-40"
                >
                  Reject all
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  disabled={processing}
                  className="h-7 rounded-md bg-[var(--success-bg-muted)] px-2.5 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted-hover)] disabled:opacity-40"
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
            <div className="mb-4 rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          {(status === "loading" || status === "processing") && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--violet-accent)]" />
              <p className="text-sm text-text-tertiary">
                {status === "loading"
                  ? "Loading extraction results..."
                  : "Extracting metrics from document..."}
              </p>
              <p className="text-xs text-text-muted">
                This may take a moment for large documents.
              </p>
            </div>
          )}

          {status === "failed" && !error && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="rounded-full bg-[var(--error-bg-subtle)] p-3">
                <Sparkles className="h-6 w-6 text-[var(--error-accent)]" />
              </div>
              <p className="text-sm text-text-tertiary">Extraction failed.</p>
              <p className="text-xs text-text-muted">
                The document may not contain recognizable financial data.
              </p>
            </div>
          )}

          {status === "completed" && mappings.length === 0 && (
            <div className="flex flex-col items-center justify-center gap-3 py-16">
              <div className="rounded-full bg-bg-elevated p-3">
                <Sparkles className="h-6 w-6 text-text-faint" />
              </div>
              <p className="text-sm text-text-tertiary">No metrics found.</p>
              <p className="text-xs text-text-muted">
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
            <div className="mt-6 flex items-center gap-2 rounded-lg border border-[var(--success-border)] bg-[var(--success-bg-subtle)] p-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-[var(--success-accent)]" />
              <p className="text-sm text-[var(--status-success-text)]">
                All metrics reviewed. {acceptedCount} accepted, {rejectedCount} rejected.
              </p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

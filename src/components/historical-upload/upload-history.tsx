"use client";

import * as React from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  FileSpreadsheet,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Download,
  Trash2,
  X,
  Calendar,
  HardDrive,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { useFocusTrap } from "@/hooks/use-focus-trap";
import type { HistoricalUpload } from "@/lib/excel/types";

type ResumePayload = {
  id: string;
  file_name: string;
  total_values_detected: number;
  companies_detected: { name: string; source: string; sheetName?: string }[] | null;
};

type Props = {
  role: "investor" | "founder";
  onResumeUpload?: (upload: ResumePayload) => void;
};

export function UploadHistory({ role, onResumeUpload }: Props) {
  const [uploads, setUploads] = useState<HistoricalUpload[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<HistoricalUpload | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [detailUpload, setDetailUpload] = useState<HistoricalUpload | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/historical-upload/list?limit=20");
        if (res.ok) {
          const data = await res.json();
          setUploads(data.uploads ?? []);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleDownload(e: React.MouseEvent, upload: HistoricalUpload) {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/historical-upload/${upload.id}/download`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = data.fileName || upload.file_name;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      // Silent failure — download is non-critical
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/historical-upload/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setUploads((prev) => prev.filter((u) => u.id !== deleteTarget.id));
        if (detailUpload?.id === deleteTarget.id) {
          setDetailUpload(null);
        }
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  }

  function handleRowClick(upload: HistoricalUpload) {
    if (upload.status === "reviewing" || upload.status === "parsed") {
      onResumeUpload?.({
        id: upload.id,
        file_name: upload.file_name,
        total_values_detected: upload.total_values_detected,
        companies_detected: null,
      });
    } else if (upload.status === "completed" || upload.status === "failed") {
      setDetailUpload(upload);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (uploads.length === 0) return null;

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-[var(--success-accent)]" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-[var(--error-accent)]" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-text-tertiary" />;
      default:
        return <Clock className="h-4 w-4 text-[var(--warning-accent)]" />;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const isClickable = (status: string) =>
    status === "reviewing" || status === "parsed" || status === "completed" || status === "failed";

  const isDeletable = (status: string) =>
    status === "completed" || status === "failed";

  const isDownloadable = (status: string) =>
    status !== "processing";

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium text-text-primary">Recent Uploads</h3>
      <div className="divide-y divide-border-default rounded-xl border border-border-default">
        {uploads.map((upload) => (
          <div
            key={upload.id}
            onClick={() => handleRowClick(upload)}
            role={isClickable(upload.status) ? "button" : undefined}
            tabIndex={isClickable(upload.status) ? 0 : undefined}
            onKeyDown={(e) => {
              if (isClickable(upload.status) && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                handleRowClick(upload);
              }
            }}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              isClickable(upload.status) && "cursor-pointer hover:bg-bg-secondary transition-colors",
            )}
          >
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-text-tertiary" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-primary">{upload.file_name}</p>
              <p className="text-xs text-text-tertiary">
                {formatDate(upload.created_at)}
                {upload.total_values_detected > 0 && (
                  <> · {upload.total_values_approved}/{upload.total_values_detected} approved</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {isDownloadable(upload.status) && (
                <button
                  type="button"
                  onClick={(e) => handleDownload(e, upload)}
                  className="rounded-md p-1.5 text-text-tertiary hover:bg-bg-elevated hover:text-text-primary transition-colors"
                  aria-label={`Download ${upload.file_name}`}
                  title="Download original file"
                >
                  <Download className="h-4 w-4" />
                </button>
              )}
              {isDeletable(upload.status) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteTarget(upload);
                  }}
                  className="rounded-md p-1.5 text-text-tertiary hover:bg-[var(--error-bg-subtle)] hover:text-[var(--error-accent)] transition-colors"
                  aria-label={`Delete ${upload.file_name}`}
                  title="Delete upload"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              {statusIcon(upload.status)}
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs",
                  upload.status === "completed" && "bg-[var(--success-bg-muted)] text-[var(--status-success-text)]",
                  upload.status === "failed" && "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
                  upload.status === "processing" && "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
                  (upload.status === "parsed" || upload.status === "reviewing") &&
                    "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
                )}
              >
                {upload.status === "reviewing" || upload.status === "parsed"
                  ? "Needs Review"
                  : upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={!!deleteTarget}
        title="Delete upload"
        message={`Are you sure you want to delete "${deleteTarget?.file_name}"? The upload record and parsed values will be permanently removed. Any metrics you already approved will remain in your reports.`}
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Slide-out detail panel for completed/failed uploads */}
      {detailUpload && (
        <UploadDetailPanel
          upload={detailUpload}
          onClose={() => setDetailUpload(null)}
          onDownload={(e) => handleDownload(e, detailUpload)}
          onDelete={() => {
            setDetailUpload(null);
            setDeleteTarget(detailUpload);
          }}
        />
      )}
    </div>
  );
}

// --- Slide-out detail panel ---

function UploadDetailPanel({
  upload,
  onClose,
  onDownload,
  onDelete,
}: {
  upload: HistoricalUpload;
  onClose: () => void;
  onDownload: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const panelRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(panelRef, true);

  // Slide in on mount
  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  // Close on escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, []);

  // Focus panel on open
  useEffect(() => {
    if (isVisible) {
      panelRef.current?.focus({ preventScroll: true });
    }
  }, [isVisible]);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const skipped = Math.max(
    0,
    upload.total_values_detected - upload.total_values_approved - upload.total_values_rejected,
  );

  const statusColor =
    upload.status === "completed"
      ? "var(--success-accent)"
      : "var(--error-accent)";

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-bg-backdrop backdrop-blur-sm transition-opacity duration-200 ${
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
        aria-labelledby="upload-detail-title"
      >
        {/* Decorative left border */}
        <div
          className="absolute left-0 top-0 bottom-0 w-[6px] opacity-60 blur-md"
          style={{ background: `linear-gradient(to bottom, ${statusColor}, transparent)` }}
        />
        <div
          className="absolute left-0 top-0 bottom-0 w-[2px] opacity-50"
          style={{ background: `linear-gradient(to bottom, ${statusColor}, var(--border-default), transparent)` }}
        />
        <div className="absolute left-0 top-0 bottom-0 w-px bg-border-default" />

        {/* Header */}
        <div className="relative px-8 pt-9 pb-6">
          <button
            onClick={handleClose}
            className="absolute right-7 top-7 flex h-8 w-8 items-center justify-center rounded-lg border border-border-subtle bg-bg-raised text-text-muted transition-all duration-200 hover:border-border-default hover:bg-bg-hover hover:text-text-primary active:scale-95"
            aria-label="Close panel"
          >
            <X className="h-3.5 w-3.5" />
          </button>

          <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-text-faint">
            Upload Details
          </span>

          <h2
            id="upload-detail-title"
            className="mt-3 pr-12 text-[22px] font-semibold leading-tight tracking-tight text-text-primary"
          >
            {upload.file_name}
          </h2>

          {/* Status badge */}
          <div className="mt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
                upload.status === "completed" && "bg-[var(--success-bg-muted)] text-[var(--status-success-text)]",
                upload.status === "failed" && "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
              )}
            >
              {upload.status === "completed" ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <XCircle className="h-3.5 w-3.5" />
              )}
              {upload.status.charAt(0).toUpperCase() + upload.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-8 pb-8">
          {/* Error message for failed uploads */}
          {upload.status === "failed" && upload.error_message && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-[var(--error-border)] bg-[var(--error-bg-subtle)] p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--error-accent)]" />
              <p className="text-sm text-[var(--status-error-text)]">{upload.error_message}</p>
            </div>
          )}

          {/* Stats grid */}
          {upload.total_values_detected > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
                Results
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-border-default bg-bg-secondary p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--success-accent)]">
                    {upload.total_values_approved}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">Approved</p>
                </div>
                <div className="rounded-lg border border-border-default bg-bg-secondary p-4 text-center">
                  <p className="text-2xl font-bold text-[var(--error-accent)]">
                    {upload.total_values_rejected}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">Rejected</p>
                </div>
                <div className="rounded-lg border border-border-default bg-bg-secondary p-4 text-center">
                  <p className="text-2xl font-bold text-text-tertiary">
                    {skipped}
                  </p>
                  <p className="mt-1 text-xs text-text-tertiary">Skipped</p>
                </div>
              </div>
            </div>
          )}

          {/* File info */}
          <div className="mb-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
              File Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-text-tertiary">Uploaded</p>
                  <p className="text-sm text-text-primary">{formatDate(upload.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <HardDrive className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-text-tertiary">File size</p>
                  <p className="text-sm text-text-primary">{formatFileSize(upload.file_size)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <div>
                  <p className="text-xs text-text-tertiary">File type</p>
                  <p className="text-sm text-text-primary">{upload.file_type || "Spreadsheet"}</p>
                </div>
              </div>
              {upload.total_values_detected > 0 && (
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                  <div>
                    <p className="text-xs text-text-tertiary">Values detected</p>
                    <p className="text-sm text-text-primary">{upload.total_values_detected}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* AI analysis info */}
          {upload.ai_provider && (
            <div className="mb-6">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-text-faint">
                AI Analysis
              </h3>
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-text-tertiary" aria-hidden="true" />
                <div>
                  <p className="text-sm text-text-primary">
                    {upload.ai_provider}
                    {upload.ai_model ? ` · ${upload.ai_model}` : ""}
                  </p>
                  {upload.parsing_time_ms != null && (
                    <p className="text-xs text-text-tertiary">
                      Processed in {(upload.parsing_time_ms / 1000).toFixed(1)}s
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-border-default px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1.5 rounded-md border border-border-default px-3 py-2 text-sm text-[var(--error-accent)] hover:bg-[var(--error-bg-subtle)] transition-colors"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
            <button
              type="button"
              onClick={onDownload}
              className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
            >
              <Download className="h-4 w-4" />
              Download File
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}

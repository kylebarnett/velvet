"use client";

import * as React from "react";
import { Download, FileText, X, Tag } from "lucide-react";
import {
  DOCUMENT_TYPE_LABELS,
  getDocumentTypeColor,
} from "@/lib/utils/document-colors";

type PreviewDocument = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number;
  document_type: string;
  description: string | null;
  uploaded_at: string;
  company?: { id: string; name: string } | null;
};

type DocumentPreviewModalProps = {
  document: PreviewDocument | null;
  onClose: () => void;
  onDownload: (doc: PreviewDocument) => void;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function DocumentPreviewModal({
  document: doc,
  onClose,
  onDownload,
}: DocumentPreviewModalProps) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const isPdf =
    doc?.file_type === "application/pdf" || doc?.file_name.endsWith(".pdf");
  const isImage = doc?.file_type?.startsWith("image/") ?? false;
  const canPreview = isPdf || isImage;

  // Load signed URL for preview
  React.useEffect(() => {
    if (!doc) return;

    setPreviewUrl(null);
    setLoading(true);
    setError(null);

    if (!canPreview) {
      setLoading(false);
      return;
    }

    async function loadPreview() {
      try {
        const res = await fetch(
          `/api/documents/download?path=${encodeURIComponent(doc!.file_path)}`
        );
        if (!res.ok) throw new Error("Failed to load preview.");
        const json = await res.json();
        setPreviewUrl(json.url);
      } catch {
        setError("Could not load preview.");
      } finally {
        setLoading(false);
      }
    }
    loadPreview();
  }, [doc?.id, doc?.file_path, canPreview, doc]);

  // Escape key to close
  React.useEffect(() => {
    if (!doc) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [doc, onClose]);

  // Prevent body scroll when modal is open
  React.useEffect(() => {
    if (doc) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [doc]);

  if (!doc) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={`Preview ${doc.file_name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative flex h-[90vh] w-[90vw] max-w-5xl flex-col overflow-hidden rounded-xl border border-border-default bg-bg-primary shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-border-default px-5 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 shrink-0 text-text-muted" />
              <span className="text-sm font-medium truncate">
                {doc.file_name}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDocumentTypeColor(doc.document_type)}`}
              >
                {DOCUMENT_TYPE_LABELS[doc.document_type] ?? doc.document_type}
              </span>
              {doc.company?.name && (
                <span className="flex items-center gap-1 text-xs text-text-tertiary">
                  <Tag className="h-3 w-3 shrink-0" />
                  {doc.company.name}
                </span>
              )}
              <span className="text-xs text-text-tertiary">
                {formatFileSize(doc.file_size)}
              </span>
              <span className="text-xs text-text-tertiary">
                {formatDate(doc.uploaded_at)}
              </span>
            </div>
            {doc.description && (
              <p className="mt-1 text-xs text-text-muted line-clamp-1">
                {doc.description}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={() => onDownload(doc)}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border-default bg-bg-elevated px-3 text-xs text-text-secondary hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Download</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              aria-label="Close preview"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto bg-bg-input">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-text-muted" />
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-20 text-sm text-text-tertiary">
              {error}
            </div>
          )}
          {!loading && !error && isPdf && previewUrl && (
            <iframe
              src={previewUrl}
              className="h-full w-full"
              title={doc.file_name}
            />
          )}
          {!loading && !error && isImage && previewUrl && (
            <div className="flex items-center justify-center p-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt={doc.file_name}
                className="max-h-full rounded-lg object-contain"
              />
            </div>
          )}
          {!loading && !canPreview && (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <FileText className="h-12 w-12 text-text-faint" />
              <p className="text-sm text-text-tertiary">
                Preview not available for this file type.
              </p>
              <button
                type="button"
                onClick={() => onDownload(doc)}
                className="inline-flex h-9 items-center gap-2 rounded-md bg-btn-primary-bg px-4 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover"
              >
                <Download className="h-4 w-4" />
                Download to view
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

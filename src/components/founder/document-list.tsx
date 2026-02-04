"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  FileText,
  Trash2,
  Download,
  Filter,
  Search,
  X,
  Calendar,
  Tag,
  ArrowLeft,
} from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExtractionStatusBadge } from "./extraction-status-badge";
import { ExtractionReviewPanel } from "./extraction-review-panel";

type Document = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number;
  document_type: string;
  description: string | null;
  period_label: string | null;
  ingestion_status: string;
  uploaded_at: string;
};

const documentTypeLabels: Record<string, string> = {
  income_statement: "Income Statement",
  balance_sheet: "Balance Sheet",
  cash_flow_statement: "Cash Flow Statement",
  consolidated_financial_statements: "Consolidated Financial Statements",
  "409a_valuation": "409A Valuation",
  investor_update: "Investor Update",
  board_deck: "Board Deck",
  cap_table: "Cap Table",
  other: "Other",
};

// Shorter labels for compact sidebar
const documentTypeShortLabels: Record<string, string> = {
  income_statement: "Income Stmt",
  balance_sheet: "Balance Sheet",
  cash_flow_statement: "Cash Flow",
  consolidated_financial_statements: "Consolidated",
  "409a_valuation": "409A",
  investor_update: "Update",
  board_deck: "Board Deck",
  cap_table: "Cap Table",
  other: "Other",
};

// Color-coded badges per document type category
const documentTypeColors: Record<string, string> = {
  // Financial statements — emerald
  income_statement: "bg-emerald-500/15 text-emerald-300",
  balance_sheet: "bg-emerald-500/15 text-emerald-300",
  cash_flow_statement: "bg-emerald-500/15 text-emerald-300",
  consolidated_financial_statements: "bg-emerald-500/15 text-emerald-300",
  // Valuation — amber
  "409a_valuation": "bg-amber-500/15 text-amber-300",
  // Communications — blue
  investor_update: "bg-blue-500/15 text-blue-300",
  board_deck: "bg-violet-500/15 text-violet-300",
  // Ownership — pink
  cap_table: "bg-pink-500/15 text-pink-300",
  // Fallback
  other: "bg-white/10 text-white/60",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-9 w-48 animate-pulse rounded-md bg-white/10" />
      <div className="hidden sm:block overflow-hidden rounded-xl border border-white/10 bg-white/5">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-white/60">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Size</th>
              <th className="p-3 font-medium">Uploaded</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-white/5">
                <td className="p-3"><div className="h-4 w-40 animate-pulse rounded bg-white/10" /></td>
                <td className="p-3"><div className="h-5 w-24 animate-pulse rounded-full bg-white/10" /></td>
                <td className="p-3"><div className="h-4 w-16 animate-pulse rounded bg-white/10" /></td>
                <td className="p-3"><div className="h-4 w-24 animate-pulse rounded bg-white/10" /></td>
                <td className="p-3"><div className="h-8 w-16 animate-pulse rounded bg-white/10" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Preview pane (inline, not overlay)                                 */
/* ------------------------------------------------------------------ */
function PreviewPane({
  doc,
  companyName,
  onClose,
  onDownload,
  onDelete,
  deleting,
}: {
  doc: Document;
  companyName: string | null;
  onClose: () => void;
  onDownload: (doc: Document) => void;
  onDelete: (doc: Document) => void;
  deleting: boolean;
}) {
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const isPdf =
    doc.file_type === "application/pdf" || doc.file_name.endsWith(".pdf");
  const isImage = doc.file_type?.startsWith("image/") ?? false;

  React.useEffect(() => {
    setPreviewUrl(null);
    setLoading(true);
    setError(null);

    async function loadPreview() {
      try {
        const res = await fetch(
          `/api/documents/download?path=${encodeURIComponent(doc.file_path)}`,
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
    if (isPdf || isImage) {
      loadPreview();
    } else {
      setLoading(false);
    }
  }, [doc.file_path, doc.id, isPdf, isImage]);

  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="flex h-full flex-col">
      {/* Header bar */}
      <div className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-white/40 hover:bg-white/5 hover:text-white/60 sm:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{doc.file_name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-white/50">
              <Tag className="h-3 w-3 shrink-0" />
              {documentTypeLabels[doc.document_type] ?? doc.document_type}
            </span>
            {doc.period_label && (
              <span className="flex items-center gap-1 text-xs text-white/50">
                <Calendar className="h-3 w-3 shrink-0" />
                {doc.period_label}
              </span>
            )}
            <span className="text-xs text-white/40">
              {formatFileSize(doc.file_size)}
            </span>
            <span className="text-xs text-white/40">
              {formatDate(doc.uploaded_at)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onDownload(doc)}
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-white/70 hover:bg-white/10"
          >
            <Download className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Download</span>
          </button>
          <button
            type="button"
            onClick={() => onDelete(doc)}
            disabled={deleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-red-400/60 hover:bg-white/10 disabled:opacity-60"
            title="Delete"
            aria-label="Delete document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {/* Desktop close */}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white/60"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Description if present */}
      {doc.description && (
        <div className="border-b border-white/5 px-4 py-2">
          <p className="text-xs text-white/50 leading-relaxed">
            {doc.description}
          </p>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-black/20">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/60" />
          </div>
        )}
        {error && (
          <div className="flex items-center justify-center py-20 text-sm text-white/40">
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
        {!loading && !isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <FileText className="h-12 w-12 text-white/10" />
            <p className="text-sm text-white/40">
              Preview not available for this file type.
            </p>
            <p className="text-xs text-white/30">
              Download the file to view its contents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main component                                                     */
/* ------------------------------------------------------------------ */
export function FounderDocumentList() {
  const router = useRouter();
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [companyName, setCompanyName] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
  const [searchQuery, setSearchQuery] = React.useState("");
  const [deleteModal, setDeleteModal] = React.useState<{ open: boolean; document: Document | null }>({
    open: false,
    document: null,
  });
  const [deleting, setDeleting] = React.useState(false);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);
  const [reviewDoc, setReviewDoc] = React.useState<Document | null>(null);

  // Auto-dismiss success message
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch documents on mount and when filter changes
  React.useEffect(() => {
    async function fetchDocuments() {
      setLoading(true);
      setError(null);
      try {
        const url = typeFilter === "all"
          ? "/api/founder/documents"
          : `/api/founder/documents?type=${typeFilter}`;
        const res = await fetch(url);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Failed to load documents.");
        if (json.companyName) setCompanyName(json.companyName);
        setDocuments(json.documents);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    fetchDocuments();
  }, [typeFilter]);

  // Client-side search filter
  const filteredDocuments = React.useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const q = searchQuery.toLowerCase();
    return documents.filter((doc) =>
      doc.file_name.toLowerCase().includes(q),
    );
  }, [documents, searchQuery]);

  function openDeleteModal(doc: Document) {
    setDeleteModal({ open: true, document: doc });
  }

  function closeDeleteModal() {
    setDeleteModal({ open: false, document: null });
  }

  async function confirmDelete() {
    const doc = deleteModal.document;
    if (!doc) return;

    closeDeleteModal();
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/founder/documents/${doc.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to delete document.");
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));
      if (previewDoc?.id === doc.id) setPreviewDoc(null);
      setSuccess("Document deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  async function downloadDocument(doc: Document) {
    try {
      const res = await fetch(`/api/documents/download?path=${encodeURIComponent(doc.file_path)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to download.");
      }
      const json = await res.json();

      // Blob download pattern
      const blobRes = await fetch(json.url);
      if (!blobRes.ok) throw new Error("Download failed.");
      const blob = await blobRes.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  const hasPreview = previewDoc !== null;

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="h-9 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20 sm:w-64"
          />
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Filter className="h-4 w-4" />
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger size="sm" className="w-auto min-w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(documentTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {/* Empty state */}
      {filteredDocuments.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-white/40" />
          <p className="mt-3 text-white/60">
            {searchQuery ? "No documents match your search." : "No documents found."}
          </p>
          {!searchQuery && (
            <p className="mt-1 text-sm text-white/40">
              Upload your first document to get started.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* ============================================ */}
          {/*  MOBILE: card list + full-screen preview     */}
          {/* ============================================ */}
          <div className="sm:hidden">
            {/* Full-screen mobile preview */}
            {previewDoc && (
              <div className="fixed inset-0 z-50 bg-zinc-950">
                <PreviewPane
                  doc={previewDoc}
                  companyName={companyName}
                  onClose={() => setPreviewDoc(null)}
                  onDownload={downloadDocument}
                  onDelete={openDeleteModal}
                  deleting={deleting}
                />
              </div>
            )}

            {/* Card list */}
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="cursor-pointer rounded-xl border border-white/10 bg-white/5 p-4 active:bg-white/10"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-white/40 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm">{doc.file_name}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                          {documentTypeLabels[doc.document_type] ?? doc.document_type}
                        </span>
                        {doc.period_label && (
                          <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                            {doc.period_label}
                          </span>
                        )}
                        <span className="text-xs text-white/40">{formatFileSize(doc.file_size)}</span>
                      </div>
                      <div className="mt-1.5">
                        <ExtractionStatusBadge status={doc.ingestion_status} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ============================================ */}
          {/*  DESKTOP: split pane (list + preview)        */}
          {/* ============================================ */}
          <div className="hidden sm:flex gap-4" style={{ height: "calc(100vh - 14rem)" }}>
            {/* Left pane — document list */}
            <div
              className={`shrink-0 overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-all duration-200 ${
                hasPreview ? "w-80" : "flex-1"
              }`}
            >
              <div className="h-full overflow-y-auto">
                {hasPreview ? (
                  /* ---- Compact sidebar list ---- */
                  <div className="p-1.5 space-y-0.5">
                    {filteredDocuments.map((doc) => {
                      const isSelected = previewDoc?.id === doc.id;
                      const typeColor = documentTypeColors[doc.document_type] ?? documentTypeColors.other;
                      return (
                        <button
                          key={doc.id}
                          type="button"
                          onClick={() => setPreviewDoc(doc)}
                          className={`group flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition-colors ${
                            isSelected
                              ? "bg-white/10 ring-1 ring-white/10"
                              : "hover:bg-white/[0.04]"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            isSelected ? "bg-white/15" : "bg-white/[0.06] group-hover:bg-white/10"
                          }`}>
                            <FileText className={`h-3.5 w-3.5 ${isSelected ? "text-white/70" : "text-white/30"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[13px] font-medium truncate leading-tight ${
                              isSelected ? "text-white" : "text-white/80"
                            }`}>
                              {doc.file_name}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none tracking-wide ${typeColor}`}>
                                {documentTypeShortLabels[doc.document_type] ?? doc.document_type}
                              </span>
                              {doc.period_label && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-white/40">
                                  <Calendar className="h-2.5 w-2.5" />
                                  {doc.period_label}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  /* ---- Full table ---- */
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-white/60">
                        <th className="p-3 font-medium">Name</th>
                        <th className="p-3 font-medium">Type</th>
                        <th className="p-3 font-medium">Period</th>
                        <th className="p-3 font-medium">Size</th>
                        <th className="p-3 font-medium">Uploaded</th>
                        <th className="p-3 font-medium">AI</th>
                        <th className="p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="cursor-pointer border-b border-white/5 hover:bg-white/5"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-white/40" />
                              <div className="min-w-0">
                                <span className="font-medium">{doc.file_name}</span>
                                {doc.description && (
                                  <div className="text-xs text-white/50 truncate">{doc.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs whitespace-nowrap">
                              {documentTypeLabels[doc.document_type] ?? doc.document_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {doc.period_label ? (
                              <span className="rounded-full bg-blue-500/20 px-2 py-0.5 text-xs text-blue-200">
                                {doc.period_label}
                              </span>
                            ) : (
                              <span className="text-white/30">&mdash;</span>
                            )}
                          </td>
                          <td className="p-3 text-white/60 whitespace-nowrap">{formatFileSize(doc.file_size)}</td>
                          <td className="p-3 text-white/60 whitespace-nowrap">{formatDate(doc.uploaded_at)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <ExtractionStatusBadge status={doc.ingestion_status} />
                              {(doc.ingestion_status === "completed" || doc.ingestion_status === "pending") && (
                                <button
                                  type="button"
                                  onClick={() => setReviewDoc(doc)}
                                  className="rounded-md border border-violet-500/20 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-200 hover:bg-violet-500/20"
                                >
                                  {doc.ingestion_status === "completed" ? "Review" : "Extract"}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); downloadDocument(doc); }}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                                title="Download"
                                aria-label="Download document"
                              >
                                <Download className="h-4 w-4 text-white/60" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(doc); }}
                                disabled={deleting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                                title="Delete"
                                aria-label="Delete document"
                              >
                                <Trash2 className="h-4 w-4 text-red-400/60" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Right pane — preview */}
            {hasPreview && (
              <div className="flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <PreviewPane
                  key={previewDoc.id}
                  doc={previewDoc}
                  companyName={companyName}
                  onClose={() => setPreviewDoc(null)}
                  onDownload={downloadDocument}
                  onDelete={openDeleteModal}
                  deleting={deleting}
                />
              </div>
            )}
          </div>
        </>
      )}

      {/* Extraction review panel */}
      {reviewDoc && (
        <ExtractionReviewPanel
          documentId={reviewDoc.id}
          documentName={reviewDoc.file_name}
          onClose={() => setReviewDoc(null)}
          onMetricsAccepted={() => {
            // Refresh server data so dashboard shows updated metrics
            router.refresh();
          }}
        />
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete Document"
        message={
          deleteModal.document
            ? `Are you sure you want to delete "${deleteModal.document.file_name}"? This action cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={closeDeleteModal}
      />
    </div>
  );
}

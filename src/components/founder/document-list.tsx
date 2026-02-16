"use client";

import * as React from "react";
import { createPortal } from "react-dom";
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
  FolderOpen,
  List,
  ChevronDown,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_TYPE_SHORT_LABELS,
  DOCUMENT_TYPE_COLORS,
} from "@/lib/utils/document-colors";
import { toast } from "sonner";
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

// Aliases for brevity (imported from shared utility)
const documentTypeLabels = DOCUMENT_TYPE_LABELS;
const documentTypeShortLabels = DOCUMENT_TYPE_SHORT_LABELS;
const documentTypeColors = DOCUMENT_TYPE_COLORS;

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
      <div className="h-9 w-48 animate-pulse rounded-md bg-bg-hover" />
      <div className="hidden sm:block overflow-hidden rounded-xl border border-border-default card-surface">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default text-left text-text-tertiary">
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Type</th>
              <th className="p-3 font-medium">Size</th>
              <th className="p-3 font-medium">Uploaded</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2, 3].map((i) => (
              <tr key={i} className="border-b border-border-subtle">
                <td className="p-3"><div className="h-4 w-40 animate-pulse rounded bg-bg-hover" /></td>
                <td className="p-3"><div className="h-5 w-24 animate-pulse rounded-full bg-bg-hover" /></td>
                <td className="p-3"><div className="h-4 w-16 animate-pulse rounded bg-bg-hover" /></td>
                <td className="p-3"><div className="h-4 w-24 animate-pulse rounded bg-bg-hover" /></td>
                <td className="p-3"><div className="h-8 w-16 animate-pulse rounded bg-bg-hover" /></td>
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
      <div className="flex items-center gap-3 border-b border-border-default px-4 py-3">
        {/* Mobile back button */}
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1 text-text-muted hover:bg-bg-elevated hover:text-text-tertiary sm:hidden"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium truncate">{doc.file_name}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-0.5">
            <span className="flex items-center gap-1 text-xs text-text-tertiary">
              <Tag className="h-3 w-3 shrink-0" />
              {documentTypeLabels[doc.document_type] ?? doc.document_type}
            </span>
            {doc.period_label && (
              <span className="flex items-center gap-1 text-xs text-text-tertiary">
                <Calendar className="h-3 w-3 shrink-0" />
                {doc.period_label}
              </span>
            )}
            <span className="text-xs text-text-tertiary">
              {formatFileSize(doc.file_size)}
            </span>
            <span className="text-xs text-text-tertiary">
              {formatDate(doc.uploaded_at)}
            </span>
          </div>
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
            onClick={() => onDelete(doc)}
            disabled={deleting}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--error-accent)] hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            title="Delete"
            aria-label="Delete document"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          {/* Desktop close */}
          <button
            type="button"
            onClick={onClose}
            className="hidden sm:inline-flex h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            aria-label="Close preview"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Description if present */}
      {doc.description && (
        <div className="border-b border-border-subtle px-4 py-2">
          <p className="text-xs text-text-tertiary leading-relaxed">
            {doc.description}
          </p>
        </div>
      )}

      {/* Content area */}
      <div className="flex-1 overflow-auto bg-bg-input">
        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-default border-t-white/60" />
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
        {!loading && !isPdf && !isImage && (
          <div className="flex flex-col items-center justify-center gap-3 py-20">
            <FileText className="h-12 w-12 text-text-faint" />
            <p className="text-sm text-text-tertiary">
              Preview not available for this file type.
            </p>
            <p className="text-xs text-text-faint">
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
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);
  const [reviewDoc, setReviewDoc] = React.useState<Document | null>(null);
  const [viewMode, setViewMode] = React.useState<"flat" | "folder">("flat");
  const [collapsedFolders, setCollapsedFolders] = React.useState<Set<string>>(new Set());
  const [sortField, setSortField] = React.useState<"name" | "type" | "size" | "date">("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  // Track per-type counts from the unfiltered document set
  const [typeCounts, setTypeCounts] = React.useState<Record<string, number>>({});

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
        // Compute per-type counts from unfiltered results
        if (typeFilter === "all") {
          const counts: Record<string, number> = {};
          for (const doc of json.documents as Document[]) {
            counts[doc.document_type] = (counts[doc.document_type] ?? 0) + 1;
          }
          setTypeCounts(counts);
        }
      } catch (err: unknown) {
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

  // Sorted documents for desktop table view
  const sortedDocuments = React.useMemo(() => {
    const sorted = [...filteredDocuments];
    sorted.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "name":
          cmp = a.file_name.localeCompare(b.file_name);
          break;
        case "type":
          cmp = a.document_type.localeCompare(b.document_type);
          break;
        case "size":
          cmp = a.file_size - b.file_size;
          break;
        case "date":
          cmp = new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredDocuments, sortField, sortDir]);

  function handleSort(field: "name" | "type" | "size" | "date") {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // Group documents by year → quarter for folder view
  const groupedDocuments = React.useMemo(() => {
    if (viewMode !== "folder") return null;
    const groups: Record<string, Record<string, Document[]>> = {};
    for (const doc of filteredDocuments) {
      const date = new Date(doc.uploaded_at);
      const year = String(date.getFullYear());
      const q = `Q${Math.floor(date.getMonth() / 3) + 1}`;

      // Use period_label if available for better grouping
      let quarterKey = q;
      if (doc.period_label) {
        const match = doc.period_label.match(/Q(\d)/i);
        if (match) quarterKey = `Q${match[1]}`;
      }

      if (!groups[year]) groups[year] = {};
      if (!groups[year][quarterKey]) groups[year][quarterKey] = [];
      groups[year][quarterKey].push(doc);
    }
    return groups;
  }, [filteredDocuments, viewMode]);

  function toggleFolder(key: string) {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  const openDeleteModal = React.useCallback((doc: Document) => {
    setDeleteModal({ open: true, document: doc });
  }, []);

  const closeDeleteModal = React.useCallback(() => {
    setDeleteModal({ open: false, document: null });
  }, []);

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
      toast.success("Document deleted.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  const downloadDocument = React.useCallback(async (doc: Document) => {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }, []);

  if (loading) {
    return <LoadingSkeleton />;
  }

  const hasPreview = previewDoc !== null;

  return (
    <div className="space-y-4">
      {/* Search + Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            aria-label="Search documents"
            className="h-9 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default sm:w-64"
          />
        </div>
        <div className="flex items-center gap-3 text-sm text-text-tertiary">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger size="sm" className="w-auto min-w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types{Object.keys(typeCounts).length > 0 ? ` (${Object.values(typeCounts).reduce((a, b) => a + b, 0)})` : ""}</SelectItem>
                {Object.entries(documentTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}{typeCounts[value] ? ` (${typeCounts[value]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex rounded-md border border-border-default">
            <button
              type="button"
              onClick={() => setViewMode("flat")}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-l-md transition-colors ${viewMode === "flat" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-tertiary"}`}
              title="List view"
              aria-label="List view"
              aria-pressed={viewMode === "flat"}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("folder")}
              className={`inline-flex h-8 w-8 items-center justify-center rounded-r-md border-l border-border-default transition-colors ${viewMode === "folder" ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-tertiary"}`}
              title="Folder view"
              aria-label="Folder view"
              aria-pressed={viewMode === "folder"}
            >
              <FolderOpen className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-4 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}
      {/* Empty state */}
      {filteredDocuments.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No documents match your search" : "No documents uploaded yet"}
          description={
            searchQuery
              ? undefined
              : "Upload pitch decks, financial statements, cap tables, and other documents. Approved investors will be able to view them."
          }
          variant={searchQuery ? "inline" : "first-use"}
        />
      ) : viewMode === "folder" && groupedDocuments ? (
        /* ============================================ */
        /*  FOLDER VIEW                                 */
        /* ============================================ */
        <div className="space-y-2">
          {Object.entries(groupedDocuments)
            .sort(([a], [b]) => b.localeCompare(a))
            .map(([year, quarters]) => {
              const yearKey = `year-${year}`;
              const isYearCollapsed = collapsedFolders.has(yearKey);
              return (
                <div key={year} className="rounded-xl border border-border-default card-surface overflow-hidden">
                  <button
                    type="button"
                    onClick={() => toggleFolder(yearKey)}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left hover:bg-bg-elevated transition-colors"
                  >
                    {isYearCollapsed ? (
                      <ChevronRight className="h-4 w-4 text-text-muted" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-text-muted" />
                    )}
                    <FolderOpen className="h-4 w-4 text-text-tertiary" />
                    <span className="text-sm font-medium text-text-primary">{year}</span>
                    <span className="text-xs text-text-muted">
                      {Object.values(quarters).reduce((sum, docs) => sum + docs.length, 0)} files
                    </span>
                  </button>
                  {!isYearCollapsed && (
                    <div className="border-t border-border-subtle">
                      {Object.entries(quarters)
                        .sort(([a], [b]) => b.localeCompare(a))
                        .map(([quarter, docs]) => {
                          const qKey = `${yearKey}-${quarter}`;
                          const isQCollapsed = collapsedFolders.has(qKey);
                          return (
                            <div key={quarter}>
                              <button
                                type="button"
                                onClick={() => toggleFolder(qKey)}
                                className="flex w-full items-center gap-2 pl-8 pr-4 py-2.5 text-left hover:bg-bg-elevated transition-colors"
                              >
                                {isQCollapsed ? (
                                  <ChevronRight className="h-3.5 w-3.5 text-text-faint" />
                                ) : (
                                  <ChevronDown className="h-3.5 w-3.5 text-text-faint" />
                                )}
                                <span className="text-sm text-text-secondary">{quarter}</span>
                                <span className="text-xs text-text-muted">{docs.length}</span>
                              </button>
                              {!isQCollapsed && (
                                <div className="border-t border-border-subtle">
                                  {docs.map((doc) => (
                                    <div
                                      key={doc.id}
                                      className="flex cursor-pointer items-center gap-3 px-4 py-2.5 pl-14 hover:bg-bg-elevated transition-colors"
                                      onClick={() => setPreviewDoc(doc)}
                                    >
                                      <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                                      <div className="min-w-0 flex-1">
                                        <span className="text-sm font-medium truncate block">{doc.file_name}</span>
                                      </div>
                                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${documentTypeColors[doc.document_type] ?? documentTypeColors.other}`}>
                                        {documentTypeShortLabels[doc.document_type] ?? doc.document_type}
                                      </span>
                                      <span className="text-xs text-text-muted">{formatFileSize(doc.file_size)}</span>
                                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          type="button"
                                          onClick={() => downloadDocument(doc)}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover"
                                          title="Download"
                                          aria-label="Download"
                                        >
                                          <Download className="h-3.5 w-3.5 text-text-tertiary" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => openDeleteModal(doc)}
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover"
                                          title="Delete"
                                          aria-label="Delete"
                                        >
                                          <Trash2 className="h-3.5 w-3.5 text-[var(--error-accent)]" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        <>
          {/* ============================================ */}
          {/*  MOBILE: card list + full-screen preview     */}
          {/* ============================================ */}
          <div className="sm:hidden">
            {/* Full-screen mobile preview */}
            {previewDoc && createPortal(
              <div className="fixed inset-0 z-50 bg-bg-primary">
                <PreviewPane
                  doc={previewDoc}
                  companyName={companyName}
                  onClose={() => setPreviewDoc(null)}
                  onDownload={downloadDocument}
                  onDelete={openDeleteModal}
                  deleting={deleting}
                />
              </div>,
              document.body,
            )}

            {/* Card list */}
            <div className="space-y-3">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="cursor-pointer rounded-xl border border-border-default card-surface p-4 active:bg-bg-hover"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <div className="flex items-start gap-3">
                    <FileText className="h-5 w-5 shrink-0 text-text-muted mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-sm">{doc.file_name}</div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${documentTypeColors[doc.document_type] ?? documentTypeColors.other}`}>
                          {documentTypeShortLabels[doc.document_type] ?? doc.document_type}
                        </span>
                        {doc.period_label && (
                          <span className="rounded-full bg-[var(--tag-blue-bg)] px-2 py-0.5 text-xs text-[var(--tag-blue-text)]">
                            {doc.period_label}
                          </span>
                        )}
                        <span className="text-xs text-text-tertiary">{formatFileSize(doc.file_size)}</span>
                      </div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <ExtractionStatusBadge status={doc.ingestion_status} />
                        {(doc.ingestion_status === "completed" || doc.ingestion_status === "pending") && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setReviewDoc(doc); }}
                            className="rounded-full border border-[var(--tag-violet-bg)] bg-[var(--tag-violet-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--tag-violet-text)] hover:opacity-80"
                          >
                            {doc.ingestion_status === "completed" ? "Review" : "Extract"}
                          </button>
                        )}
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
              className={`shrink-0 overflow-hidden rounded-xl border border-border-default card-surface transition-all duration-200 ${
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
                              ? "bg-bg-hover ring-1 ring-border-default"
                              : "hover:bg-bg-raised"
                          }`}
                        >
                          <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
                            isSelected ? "bg-bg-hover" : "bg-bg-elevated group-hover:bg-bg-hover"
                          }`}>
                            <FileText className={`h-3.5 w-3.5 ${isSelected ? "text-text-secondary" : "text-text-faint"}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className={`text-[13px] font-medium truncate leading-tight ${
                              isSelected ? "text-text-primary" : "text-text-primary"
                            }`}>
                              {doc.file_name}
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium leading-none tracking-wide ${typeColor}`}>
                                {documentTypeShortLabels[doc.document_type] ?? doc.document_type}
                              </span>
                              {doc.period_label && (
                                <span className="inline-flex items-center gap-1 text-[11px] text-text-tertiary">
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
                      <tr className="border-b border-border-default text-left text-text-tertiary">
                        <th
                          className="cursor-pointer select-none p-3 font-medium hover:text-text-secondary"
                          onClick={() => handleSort("name")}
                          aria-sort={sortField === "name" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            Name
                            {sortField === "name" && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                        <th
                          className="cursor-pointer select-none p-3 font-medium hover:text-text-secondary"
                          onClick={() => handleSort("type")}
                          aria-sort={sortField === "type" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            Type
                            {sortField === "type" && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                        <th className="p-3 font-medium">Period</th>
                        <th
                          className="cursor-pointer select-none p-3 font-medium hover:text-text-secondary"
                          onClick={() => handleSort("size")}
                          aria-sort={sortField === "size" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            Size
                            {sortField === "size" && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                        <th
                          className="cursor-pointer select-none p-3 font-medium hover:text-text-secondary"
                          onClick={() => handleSort("date")}
                          aria-sort={sortField === "date" ? (sortDir === "asc" ? "ascending" : "descending") : undefined}
                        >
                          <span className="inline-flex items-center gap-1">
                            Uploaded
                            {sortField === "date" && <ArrowUpDown className="h-3 w-3" />}
                          </span>
                        </th>
                        <th className="p-3 font-medium">AI</th>
                        <th className="p-3 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedDocuments.map((doc) => (
                        <tr
                          key={doc.id}
                          className="cursor-pointer border-b border-border-subtle hover:bg-bg-elevated"
                          onClick={() => setPreviewDoc(doc)}
                        >
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 shrink-0 text-text-muted" />
                              <div className="min-w-0">
                                <span className="font-medium">{doc.file_name}</span>
                                {doc.description && (
                                  <div className="text-xs text-text-tertiary truncate">{doc.description}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="p-3">
                            <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${documentTypeColors[doc.document_type] ?? documentTypeColors.other}`}>
                              {documentTypeLabels[doc.document_type] ?? doc.document_type}
                            </span>
                          </td>
                          <td className="p-3">
                            {doc.period_label ? (
                              <span className="rounded-full bg-[var(--tag-blue-bg)] px-2 py-0.5 text-xs text-[var(--tag-blue-text)]">
                                {doc.period_label}
                              </span>
                            ) : (
                              <span className="text-text-faint">&mdash;</span>
                            )}
                          </td>
                          <td className="p-3 text-text-tertiary whitespace-nowrap">{formatFileSize(doc.file_size)}</td>
                          <td className="p-3 text-text-tertiary whitespace-nowrap">{formatDate(doc.uploaded_at)}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <ExtractionStatusBadge status={doc.ingestion_status} />
                              {(doc.ingestion_status === "completed" || doc.ingestion_status === "pending") && (
                                <button
                                  type="button"
                                  onClick={() => setReviewDoc(doc)}
                                  className="rounded-full border border-[var(--tag-violet-bg)] bg-[var(--tag-violet-bg)] px-2 py-0.5 text-[11px] font-medium text-[var(--tag-violet-text)] hover:opacity-80"
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
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                                title="Download"
                                aria-label="Download document"
                              >
                                <Download className="h-4 w-4 text-text-tertiary" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); openDeleteModal(doc); }}
                                disabled={deleting}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                                title="Delete"
                                aria-label="Delete document"
                              >
                                <Trash2 className="h-4 w-4 text-[var(--error-accent)]" />
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
              <div className="flex-1 overflow-hidden rounded-xl border border-border-default card-surface">
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

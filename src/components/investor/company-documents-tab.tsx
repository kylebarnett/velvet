"use client";

import * as React from "react";
import { Download, Eye, FileText, Search, X } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import {
  DOCUMENT_TYPE_SHORT_LABELS,
  DOCUMENT_TYPES,
  getDocumentTypeColor,
} from "@/lib/utils/document-colors";
import { logActivity } from "@/lib/activity/log-activity";
import { DocumentPreviewModal } from "./document-preview-modal";

type DateFilterValue = "all" | "7" | "30" | "90";

const DATE_FILTER_TABS: TabItem<DateFilterValue>[] = [
  { value: "all", label: "All" },
  { value: "7", label: "7d" },
  { value: "30", label: "30d" },
  { value: "90", label: "90d" },
];

type Document = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number;
  document_type: string;
  description: string | null;
  uploaded_at: string;
};

type CompanyDocumentsTabProps = {
  companyId: string;
  companyName: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CompanyDocumentsTab({ companyId, companyName }: CompanyDocumentsTabProps) {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>("all");

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [downloading, setDownloading] = React.useState(false);

  // Preview
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);

  // Fetch documents for this company
  React.useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ companyId });
      if (typeFilter) params.set("type", typeFilter);
      if (search) params.set("search", search);

      const res = await fetch(`/api/investors/documents?${params.toString()}`);
      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error ?? "Failed to load documents.");
        setDocuments([]);
      } else {
        setDocuments(json.documents ?? []);
      }
      setLoading(false);
    }
    loadDocuments();
  }, [companyId, typeFilter, search]);

  // Clear selection when filters change
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [typeFilter, search, dateFilter]);

  // Filter by date (client-side)
  const filteredDocuments = React.useMemo(() => {
    if (dateFilter === "all") return documents;

    const days = parseInt(dateFilter, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return documents.filter((doc) => new Date(doc.uploaded_at) >= cutoff);
  }, [documents, dateFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === filteredDocuments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredDocuments.map((d) => d.id)));
    }
  }

  async function downloadSingle(doc: Document) {
    const res = await fetch(`/api/investors/documents/download?ids=${doc.id}`);
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? "Download failed.");
      return;
    }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logActivity({
      companyId,
      action: "download_document",
      metadata: { document_name: doc.file_name, count: 1 },
    });
  }

  async function downloadSelected() {
    if (selectedIds.size === 0) return;

    setDownloading(true);
    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/investors/documents/download?ids=${ids}`);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.error ?? "Download failed.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      a.download = `${safeName}-documents-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logActivity({
        companyId,
        action: "download_document",
        metadata: { count: selectedIds.size, bulk: true },
      });
    } finally {
      setDownloading(false);
    }
  }

  async function downloadAll() {
    setDownloading(true);
    try {
      const params = new URLSearchParams({ companyId });
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/investors/documents/download?${params.toString()}`);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        alert(json?.error ?? "Download failed.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, "-");
      a.download = `${safeName}-documents-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logActivity({
        companyId,
        action: "download_document",
        metadata: { count: filteredDocuments.length, bulk: true, all: true },
      });
    } finally {
      setDownloading(false);
    }
  }

  const allSelected = filteredDocuments.length > 0 && selectedIds.size === filteredDocuments.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search by filename..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-3 text-sm outline-none placeholder:text-text-faint focus:border-border-default"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-bg-hover rounded"
                type="button"
              >
                <X className="h-3 w-3 text-text-muted" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select
            value={typeFilter || "__all__"}
            onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-[180px]" size="sm">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All types</SelectItem>
              {DOCUMENT_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Date filter */}
          <SlidingTabs
            tabs={DATE_FILTER_TABS}
            value={dateFilter}
            onChange={setDateFilter}
            size="sm"
            showIcons={false}
          />
        </div>

        {/* Bulk actions */}
        <div className="flex flex-wrap items-center gap-2">
          {filteredDocuments.length > 0 && (
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-border-default bg-bg-elevated px-3 text-sm font-medium text-text-primary hover:bg-bg-hover disabled:opacity-60"
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              Download all
            </button>
          )}
          {someSelected && (
            <button
              onClick={downloadSelected}
              disabled={downloading}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
              type="button"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? "..." : `${selectedIds.size} selected`}
            </button>
          )}
          <span className="text-sm text-text-tertiary">
            {filteredDocuments.length} document{filteredDocuments.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 rounded-lg border border-border-default bg-bg-elevated p-3">
              <div className="h-4 w-4 animate-pulse rounded bg-bg-hover" />
              <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
              <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
              <div className="ml-auto h-4 w-16 animate-pulse rounded bg-bg-hover" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredDocuments.length === 0 && (
        <div className="rounded-xl border border-border-default card-surface p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-text-faint" />
          <p className="mt-2 text-sm text-text-tertiary">No documents found.</p>
          <p className="mt-1 text-xs text-text-tertiary">
            {search || typeFilter || dateFilter !== "all"
              ? "Try adjusting your filters."
              : "Documents uploaded by the founder will appear here."}
          </p>
        </div>
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={(doc) => {
          downloadSingle(doc as Document);
        }}
      />

      {/* Documents list */}
      {!loading && filteredDocuments.length > 0 && (
        <div className="space-y-2">
          {/* Select all */}
          <div className="flex items-center gap-3 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
            />
            <span className="text-xs text-text-tertiary">Select all</span>
          </div>

          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-elevated p-3 cursor-pointer hover:bg-bg-hover transition-colors"
              onClick={() => setPreviewDoc(doc)}
            >
              <div onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => toggleSelect(doc.id)}
                  className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                />
              </div>
              <FileText className="h-4 w-4 shrink-0 text-text-muted" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate text-sm">{doc.file_name}</p>
                {doc.description && (
                  <p className="text-xs text-text-tertiary truncate">{doc.description}</p>
                )}
              </div>
              <span className={`hidden sm:inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${getDocumentTypeColor(doc.document_type)}`}>
                {DOCUMENT_TYPE_SHORT_LABELS[doc.document_type] ?? doc.document_type}
              </span>
              <span className="hidden sm:inline shrink-0 text-xs text-text-tertiary">
                {formatFileSize(doc.file_size)}
              </span>
              <span className="shrink-0 text-xs text-text-tertiary">
                {formatDate(doc.uploaded_at)}
              </span>
              <div className="flex shrink-0 items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => setPreviewDoc(doc)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                  type="button"
                  title="Preview"
                  aria-label={`Preview ${doc.file_name}`}
                >
                  <Eye className="h-4 w-4 text-text-muted" />
                </button>
                <button
                  onClick={() => downloadSingle(doc)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                  type="button"
                  title="Download"
                  aria-label={`Download ${doc.file_name}`}
                >
                  <Download className="h-4 w-4 text-text-muted" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

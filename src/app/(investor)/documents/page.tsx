"use client";

import * as React from "react";
import { Download, Eye, FileText, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import {
  DOCUMENT_TYPE_SHORT_LABELS,
  DOCUMENT_TYPES,
  getDocumentTypeColor,
} from "@/lib/utils/document-colors";
import { toast } from "sonner";
import { logActivity } from "@/lib/activity/log-activity";
import { DocumentPreviewModal } from "@/components/investor/document-preview-modal";

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
  company: {
    id: string;
    name: string;
  } | null;
};

type Company = {
  id: string;
  name: string;
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

export default function DocumentsPage() {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Filters
  const [search, setSearch] = React.useState("");
  const [companyFilter, setCompanyFilter] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("");
  const [dateFilter, setDateFilter] = React.useState<DateFilterValue>("all");

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [downloading, setDownloading] = React.useState(false);

  // Preview
  const [previewDoc, setPreviewDoc] = React.useState<Document | null>(null);

  // Fetch companies for filter dropdown
  React.useEffect(() => {
    async function loadCompanies() {
      const res = await fetch("/api/investors/companies");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.companies) {
        // Only include companies with approved status
        const approved = json.companies.filter(
          (c: { approvalStatus: string }) =>
            c.approvalStatus === "auto_approved" || c.approvalStatus === "approved"
        );
        setCompanies(
          approved.map((c: { id: string; name: string }) => ({
            id: c.id,
            name: c.name,
          }))
        );
      }
    }
    loadCompanies();
  }, []);

  // Fetch documents with filters
  React.useEffect(() => {
    async function loadDocuments() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (companyFilter) params.set("companyId", companyFilter);
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
  }, [companyFilter, typeFilter, search]);

  // Clear selection when filters change
  React.useEffect(() => {
    setSelectedIds(new Set());
  }, [companyFilter, typeFilter, search, dateFilter]);

  // Filter documents by date (client-side)
  const filteredDocuments = React.useMemo(() => {
    if (dateFilter === "all") return documents;

    const days = parseInt(dateFilter, 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    return documents.filter((doc) => {
      const docDate = new Date(doc.uploaded_at);
      return docDate >= cutoff;
    });
  }, [documents, dateFilter]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    // Get signed URL for single file download
    const res = await fetch(
      `/api/investors/documents/download?ids=${doc.id}`
    );
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      toast.error(json?.error ?? "Download failed.");
      return;
    }

    // Download the blob
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    if (doc.company?.id) {
      logActivity({
        companyId: doc.company.id,
        action: "download_document",
        metadata: { document_name: doc.file_name, count: 1 },
      });
    }
  }

  async function downloadSelected() {
    if (selectedIds.size === 0) return;

    setDownloading(true);
    try {
      const ids = Array.from(selectedIds).join(",");
      const res = await fetch(`/api/investors/documents/download?ids=${ids}`);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error ?? "Download failed.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `velvet-documents-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Log per company — each founder sees their own activity
      const selectedDocs = filteredDocuments.filter((d) => selectedIds.has(d.id));
      const byCompany = new Map<string, number>();
      for (const doc of selectedDocs) {
        if (doc.company?.id) {
          byCompany.set(doc.company.id, (byCompany.get(doc.company.id) ?? 0) + 1);
        }
      }
      for (const [cId, count] of byCompany) {
        logActivity({
          companyId: cId,
          action: "download_document",
          metadata: { count, bulk: true },
        });
      }
    } finally {
      setDownloading(false);
    }
  }

  async function downloadAllForCompany() {
    if (!companyFilter) return;

    setDownloading(true);
    try {
      const params = new URLSearchParams({ companyId: companyFilter });
      if (typeFilter) params.set("type", typeFilter);

      const res = await fetch(`/api/investors/documents/download?${params.toString()}`);

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        toast.error(json?.error ?? "Download failed.");
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const company = companies.find((c) => c.id === companyFilter);
      const companyName = company?.name.toLowerCase().replace(/[^a-z0-9]/g, "-") ?? "company";
      a.download = `${companyName}-documents-${new Date().toISOString().split("T")[0]}.zip`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      logActivity({
        companyId: companyFilter,
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
    <div className="space-y-8">
      <div>
        <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Documents" }]} />
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Documents</h1>
      </div>

      {/* Filters */}
      <div className="space-y-4">
        {/* Search - full width on mobile */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-8 text-sm placeholder:text-text-muted focus:border-border-default focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            aria-label="Search by filename"
          />
          {search && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
              type="button"
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* Dropdowns row */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Company filter */}
          <Select
            value={companyFilter || "__all__"}
            onValueChange={(v) => setCompanyFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="All companies" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All companies</SelectItem>
              {companies.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Type filter */}
          <Select
            value={typeFilter || "__all__"}
            onValueChange={(v) => setTypeFilter(v === "__all__" ? "" : v)}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
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
          {companyFilter && filteredDocuments.length > 0 && (
            <Button
              variant="secondary"
              onClick={downloadAllForCompany}
              disabled={downloading}
              type="button"
            >
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download all</span>
              <span className="sm:hidden">All</span>
            </Button>
          )}
          {someSelected && (
            <Button
              onClick={downloadSelected}
              disabled={downloading}
              type="button"
            >
              <Download className="h-4 w-4" />
              {downloading
                ? "..."
                : `${selectedIds.size} selected`}
            </Button>
          )}
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
        <div className="rounded-xl border border-border-default card-surface p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg bg-bg-elevated p-3"
              >
                <div className="h-5 w-5 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-20 animate-pulse rounded bg-bg-hover" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-bg-hover" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result count when filtering */}
      {!loading && (search || companyFilter || typeFilter || dateFilter !== "all") && (
        <div className="flex items-center gap-3">
          {filteredDocuments.length > 0 && filteredDocuments.length < documents.length && (
            <p className="text-xs text-text-muted">
              Showing {filteredDocuments.length} of {documents.length} results
            </p>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setCompanyFilter("");
              setTypeFilter("");
              setDateFilter("all");
            }}
          >
            Reset filters
          </Button>
        </div>
      )}

      {/* Documents table */}
      {!loading && filteredDocuments.length === 0 && (
        search || companyFilter || typeFilter || dateFilter !== "all" ? (
          <EmptyState
            variant="no-results"
            title="No results found"
            description={search ? `No matches for "${search}"` : "Try adjusting your filters"}
          />
        ) : (
          <EmptyState
            variant="first-use"
            title="No documents yet"
            description="Documents uploaded by founders will appear here."
          />
        )
      )}

      {/* Document Preview Modal */}
      <DocumentPreviewModal
        document={previewDoc}
        onClose={() => setPreviewDoc(null)}
        onDownload={(doc) => {
          downloadSingle(doc as Document);
        }}
      />

      {!loading && filteredDocuments.length > 0 && (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {/* Select all on mobile */}
            <div className="flex items-center gap-3 px-1">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                aria-label="Select all documents"
              />
              <span className="text-xs text-text-tertiary">Select all</span>
            </div>

            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="cursor-pointer rounded-xl border border-border-default card-surface p-4 active:bg-bg-hover"
                onClick={() => setPreviewDoc(doc)}
              >
                <div className="flex items-start gap-3">
                  <div onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="mt-1 h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-text-muted mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{doc.file_name}</p>
                        {doc.description && (
                          <p className="text-xs text-text-tertiary line-clamp-2 mt-0.5">{doc.description}</p>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${getDocumentTypeColor(doc.document_type)}`}>
                        {DOCUMENT_TYPE_SHORT_LABELS[doc.document_type] ?? doc.document_type}
                      </span>
                      <span className="text-xs text-text-tertiary">{formatFileSize(doc.file_size)}</span>
                    </div>
                    <div className="mt-1 text-xs text-text-tertiary">
                      {doc.company?.name ?? "Unknown"} · {formatDate(doc.uploaded_at)}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => setPreviewDoc(doc)}
                      type="button"
                      title="Preview"
                      aria-label={`Preview ${doc.file_name}`}
                    >
                      <Eye className="h-4 w-4 text-text-muted" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => downloadSingle(doc)}
                      type="button"
                      title="Download"
                      aria-label={`Download ${doc.file_name}`}
                    >
                      <Download className="h-4 w-4 text-text-muted" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl border border-border-default card-surface">
            {/* Table header */}
            <div className="flex items-center gap-4 border-b border-border-default px-4 py-3 text-xs font-medium uppercase tracking-wide text-text-tertiary">
              <div className="w-6">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                  aria-label="Select all documents"
                />
              </div>
              <div className="flex-1 min-w-0">Name</div>
              <div className="w-32">Company</div>
              <div className="w-36">Type</div>
              <div className="w-20">Size</div>
              <div className="w-24">Date</div>
              <div className="w-20"></div>
            </div>

            {/* Table rows */}
            <div className="divide-y divide-border-subtle">
              {filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-4 px-4 py-3 cursor-pointer hover:bg-bg-elevated"
                  onClick={() => setPreviewDoc(doc)}
                >
                  <div className="w-6" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelect(doc.id)}
                      className="h-4 w-4 rounded border-border-default bg-bg-input text-text-primary accent-white"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-medium">{doc.file_name}</p>
                    {doc.description && (
                      <p className="truncate text-xs text-text-tertiary">{doc.description}</p>
                    )}
                  </div>
                  <div className="w-32 truncate text-sm text-text-secondary">
                    {doc.company?.name ?? "Unknown"}
                  </div>
                  <div className="w-36">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${getDocumentTypeColor(doc.document_type)}`}>
                      {DOCUMENT_TYPE_SHORT_LABELS[doc.document_type] ?? doc.document_type}
                    </span>
                  </div>
                  <div className="w-20 text-sm text-text-tertiary">
                    {formatFileSize(doc.file_size)}
                  </div>
                  <div className="w-24 text-sm text-text-tertiary">
                    {formatDate(doc.uploaded_at)}
                  </div>
                  <div className="flex w-20 items-center gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => setPreviewDoc(doc)}
                      type="button"
                      title="Preview"
                      aria-label={`Preview ${doc.file_name}`}
                    >
                      <Eye className="h-4 w-4 text-text-muted" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-lg"
                      onClick={() => downloadSingle(doc)}
                      type="button"
                      title="Download"
                      aria-label={`Download ${doc.file_name}`}
                    >
                      <Download className="h-4 w-4 text-text-muted" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

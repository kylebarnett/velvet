"use client";

import * as React from "react";
import { Download, FileText, Search, X } from "lucide-react";

const DOCUMENT_TYPES = [
  { value: "income_statement", label: "Income Statement" },
  { value: "balance_sheet", label: "Balance Sheet" },
  { value: "cash_flow_statement", label: "Cash Flow Statement" },
  { value: "consolidated_financial_statements", label: "Consolidated Financial Statements" },
  { value: "409a_valuation", label: "409A Valuation" },
  { value: "investor_update", label: "Investor Update" },
  { value: "board_deck", label: "Board Deck" },
  { value: "cap_table", label: "Cap Table" },
  { value: "other", label: "Other" },
] as const;

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
  DOCUMENT_TYPES.map((t) => [t.value, t.label])
);

type Document = {
  id: string;
  file_name: string;
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

  // Selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [downloading, setDownloading] = React.useState(false);

  // Fetch companies for filter dropdown
  React.useEffect(() => {
    async function loadCompanies() {
      const res = await fetch("/api/investors/companies");
      const json = await res.json().catch(() => null);
      if (res.ok && json?.companies) {
        // Only include companies with approved status
        const approved = json.companies.filter(
          (c: any) =>
            c.approvalStatus === "auto_approved" || c.approvalStatus === "approved"
        );
        setCompanies(
          approved.map((c: any) => ({
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
  }, [companyFilter, typeFilter, search]);

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
    if (selectedIds.size === documents.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(documents.map((d) => d.id)));
    }
  }

  async function downloadSingle(doc: Document) {
    // Get signed URL for single file download
    const res = await fetch(
      `/api/investors/documents/download?ids=${doc.id}`
    );
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      alert(json?.error ?? "Download failed.");
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
      a.download = `velvet-documents-${new Date().toISOString().split("T")[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
        alert(json?.error ?? "Download failed.");
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
    } finally {
      setDownloading(false);
    }
  }

  const allSelected = documents.length > 0 && selectedIds.size === documents.length;
  const someSelected = selectedIds.size > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Documents</h1>
        <p className="text-sm text-white/60">
          View and download documents from your portfolio companies.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search by filename..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-64 rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded"
              type="button"
            >
              <X className="h-3 w-3 text-white/40" />
            </button>
          )}
        </div>

        {/* Company filter */}
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
        >
          <option value="">All companies</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
        >
          <option value="">All types</option>
          {DOCUMENT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>

        {/* Bulk actions */}
        <div className="ml-auto flex items-center gap-2">
          {companyFilter && documents.length > 0 && (
            <button
              onClick={downloadAllForCompany}
              disabled={downloading}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10 disabled:opacity-60"
              type="button"
            >
              <Download className="h-4 w-4" />
              Download all
            </button>
          )}
          {someSelected && (
            <button
              onClick={downloadSelected}
              disabled={downloading}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
              type="button"
            >
              <Download className="h-4 w-4" />
              {downloading
                ? "Downloading..."
                : `Download ${selectedIds.size} selected`}
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center gap-4 rounded-lg bg-white/5 p-3"
              >
                <div className="h-5 w-5 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-20 animate-pulse rounded bg-white/10" />
                <div className="ml-auto h-4 w-16 animate-pulse rounded bg-white/10" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Documents table */}
      {!loading && documents.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-white/30" />
          <p className="mt-2 text-sm text-white/60">No documents found.</p>
          <p className="mt-1 text-xs text-white/40">
            {search || companyFilter || typeFilter
              ? "Try adjusting your filters."
              : "Documents uploaded by founders will appear here."}
          </p>
        </div>
      )}

      {!loading && documents.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5">
          {/* Table header */}
          <div className="flex items-center gap-4 border-b border-white/10 px-4 py-3 text-xs font-medium uppercase tracking-wide text-white/50">
            <div className="w-6">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleSelectAll}
                className="h-4 w-4 rounded border-white/20 bg-black/30 text-white accent-white"
              />
            </div>
            <div className="flex-1 min-w-0">Name</div>
            <div className="w-32">Company</div>
            <div className="w-28">Type</div>
            <div className="w-20">Size</div>
            <div className="w-24">Date</div>
            <div className="w-10"></div>
          </div>

          {/* Table rows */}
          <div className="divide-y divide-white/5">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center gap-4 px-4 py-3 hover:bg-white/5"
              >
                <div className="w-6">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(doc.id)}
                    onChange={() => toggleSelect(doc.id)}
                    className="h-4 w-4 rounded border-white/20 bg-black/30 text-white accent-white"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium">{doc.file_name}</p>
                  {doc.description && (
                    <p className="truncate text-xs text-white/50">{doc.description}</p>
                  )}
                </div>
                <div className="w-32 truncate text-sm text-white/70">
                  {doc.company?.name ?? "Unknown"}
                </div>
                <div className="w-28">
                  <span className="inline-flex rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                    {TYPE_LABELS[doc.document_type] ?? doc.document_type}
                  </span>
                </div>
                <div className="w-20 text-sm text-white/50">
                  {formatFileSize(doc.file_size)}
                </div>
                <div className="w-24 text-sm text-white/50">
                  {formatDate(doc.uploaded_at)}
                </div>
                <div className="w-10">
                  <button
                    onClick={() => downloadSingle(doc)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                    type="button"
                    title="Download"
                  >
                    <Download className="h-4 w-4 text-white/50" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

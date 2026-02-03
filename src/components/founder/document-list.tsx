"use client";

import * as React from "react";
import { FileText, Trash2, Download, Filter, Search } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Document = {
  id: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number;
  document_type: string;
  description: string | null;
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

export function FounderDocumentList() {
  const [documents, setDocuments] = React.useState<Document[]>([]);
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

  return (
    <div className="space-y-4">
      {/* Search */}
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

      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Filter className="h-4 w-4" />
          <span>Filter by type:</span>
        </div>
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

      {/* Document list */}
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
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start gap-3">
                  <FileText className="h-5 w-5 shrink-0 text-white/40 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{doc.file_name}</div>
                    {doc.description && (
                      <div className="text-xs text-white/50 mt-0.5 line-clamp-2">{doc.description}</div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {documentTypeLabels[doc.document_type] ?? doc.document_type}
                      </span>
                      <span className="text-xs text-white/50">{formatFileSize(doc.file_size)}</span>
                      <span className="text-xs text-white/50">{formatDate(doc.uploaded_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/5 pt-3">
                  <button
                    onClick={() => downloadDocument(doc)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-white/10"
                  >
                    <Download className="h-4 w-4 text-white/60" />
                    <span className="text-white/60">Download</span>
                  </button>
                  <button
                    onClick={() => openDeleteModal(doc)}
                    disabled={deleting}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4 text-red-400/60" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
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
                {filteredDocuments.map((doc) => (
                  <tr key={doc.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-white/40" />
                        <div>
                          <div className="font-medium">{doc.file_name}</div>
                          {doc.description && (
                            <div className="text-xs text-white/50">{doc.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
                        {documentTypeLabels[doc.document_type] ?? doc.document_type}
                      </span>
                    </td>
                    <td className="p-3 text-white/60">{formatFileSize(doc.file_size)}</td>
                    <td className="p-3 text-white/60">{formatDate(doc.uploaded_at)}</td>
                    <td className="p-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => downloadDocument(doc)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                          title="Download"
                        >
                          <Download className="h-4 w-4 text-white/60" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(doc)}
                          disabled={deleting}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4 text-red-400/60" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
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

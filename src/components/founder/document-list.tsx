"use client";

import * as React from "react";
import { FileText, Trash2, Download, Filter } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";

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

export function FounderDocumentList() {
  const [documents, setDocuments] = React.useState<Document[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [typeFilter, setTypeFilter] = React.useState<string>("all");
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
      // Get a signed URL for the document
      const res = await fetch(`/api/documents/download?path=${encodeURIComponent(doc.file_path)}`);
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Failed to download.");
      }
      const json = await res.json();
      // Open download URL
      window.open(json.url, "_blank");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Download failed.");
    }
  }

  if (loading) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8">
        <div className="flex items-center justify-center text-white/60">
          Loading documents...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Filter className="h-4 w-4" />
          <span>Filter by type:</span>
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="h-10 sm:h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
        >
          <option value="all">All types</option>
          {Object.entries(documentTypeLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
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
      {documents.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 sm:p-8 text-center">
          <FileText className="mx-auto h-10 w-10 text-white/40" />
          <p className="mt-3 text-white/60">No documents found.</p>
          <p className="mt-1 text-sm text-white/40">
            Upload your first document to get started.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {documents.map((doc) => (
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
                {documents.map((doc) => (
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

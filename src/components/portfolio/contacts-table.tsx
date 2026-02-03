"use client";

import * as React from "react";
import { Mail, Pencil, Trash2, Send, Search, ChevronLeft, ChevronRight, X, Check } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/lib/hooks/use-debounce";

type Company = {
  id: string;
  name: string;
  founder_id: string | null;
};

type Contact = {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  status: "pending" | "sent" | "accepted";
  invite_token: string;
  sent_at: string | null;
  accepted_at: string | null;
  created_at: string;
  company_id: string;
  companies: Company | Company[] | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Props = {
  initialContacts: Contact[];
  initialPagination: Pagination;
};

export function ContactsTable({ initialContacts, initialPagination }: Props) {
  const [contacts, setContacts] = React.useState(initialContacts);
  const [pagination, setPagination] = React.useState(initialPagination);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ first_name: "", last_name: "", email: "" });
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [inviteLinks, setInviteLinks] = React.useState<{ email: string; url: string }[] | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  });

  // Debounce search for server-side filtering
  const debouncedSearch = useDebounce(search, 300);

  // Track if this is the initial render to avoid unnecessary fetch
  const isInitialMount = React.useRef(true);

  // Auto-dismiss success message after 4 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  // Fetch contacts when pagination, search, or status changes
  React.useEffect(() => {
    // Skip fetch on initial mount - we already have server-rendered data
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    async function fetchContacts() {
      setFetching(true);
      try {
        const params = new URLSearchParams({
          page: pagination.page.toString(),
          limit: pagination.limit.toString(),
        });
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (statusFilter !== "all") params.set("status", statusFilter);

        const res = await fetch(`/api/investors/portfolio/contacts?${params}`);
        const json = await res.json();

        if (!res.ok) {
          throw new Error(json?.error ?? "Failed to load contacts.");
        }

        setContacts(json.contacts);
        setPagination(json.pagination);
        setSelectedIds(new Set()); // Clear selection on page change
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    }

    fetchContacts();
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter]);

  const getCompanyName = (contact: Contact): string => {
    if (!contact.companies) return "";
    if (Array.isArray(contact.companies)) {
      return contact.companies[0]?.name ?? "";
    }
    return contact.companies.name ?? "";
  };

  const pendingCount = contacts.filter((c) => c.status === "pending").length;

  function toggleSelect(id: string) {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  }

  function toggleSelectAll() {
    if (selectedIds.size === contacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(contacts.map((c) => c.id)));
    }
  }

  function goToPage(page: number) {
    if (page < 1 || page > pagination.totalPages) return;
    setPagination((prev) => ({ ...prev, page }));
  }

  async function sendInvite(ids: string[]) {
    setLoading(true);
    setError(null);
    setSuccess(null);
    setInviteLinks(null);

    try {
      const res = await fetch("/api/investors/portfolio/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationIds: ids }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to send invitations.");
      }

      setSuccess(`Sent ${json.sent} invitation${json.sent === 1 ? "" : "s"}.`);

      // Show invite links in dev mode for manual testing
      if (json.inviteLinks && json.inviteLinks.length > 0) {
        setInviteLinks(json.inviteLinks);
      }

      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          ids.includes(c.id) ? { ...c, status: "sent" as const, sent_at: new Date().toISOString() } : c
        )
      );
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function sendAllPending() {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/investors/portfolio/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to send invitations.");
      }

      setSuccess(`Sent ${json.sent} invitation${json.sent === 1 ? "" : "s"}.`);

      // Update local state
      setContacts((prev) =>
        prev.map((c) =>
          c.status === "pending" ? { ...c, status: "sent" as const, sent_at: new Date().toISOString() } : c
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function startEdit(contact: Contact) {
    setEditingId(contact.id);
    setEditForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
    });
  }

  async function saveEdit() {
    if (!editingId) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/investors/portfolio/contacts", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingId, ...editForm }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to update contact.");
      }

      setContacts((prev) =>
        prev.map((c) => (c.id === editingId ? { ...c, ...editForm } : c))
      );
      setEditingId(null);
      setSuccess("Contact updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function openDeleteModal(contact: Contact) {
    setDeleteModal({ open: true, contact });
  }

  function closeDeleteModal() {
    setDeleteModal({ open: false, contact: null });
  }

  async function confirmDelete() {
    const contact = deleteModal.contact;
    if (!contact) return;

    closeDeleteModal();
    setLoading(true);
    setError(null);
    const id = contact.id;

    try {
      const res = await fetch("/api/investors/portfolio/contacts", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to delete contact.");
      }

      setContacts((prev) => prev.filter((c) => c.id !== id));
      setPagination((prev) => ({ ...prev, total: prev.total - 1 }));
      setSuccess("Contact deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return;

    setLoading(true);
    setError(null);
    setSuccess(null);

    const ids = Array.from(selectedIds);
    let deleted = 0;
    const errors: string[] = [];

    for (const id of ids) {
      try {
        const res = await fetch("/api/investors/portfolio/contacts", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id }),
        });

        if (!res.ok) {
          const json = await res.json().catch(() => null);
          errors.push(json?.error ?? "Failed to delete contact.");
        } else {
          deleted++;
        }
      } catch {
        errors.push("Network error.");
      }
    }

    if (deleted > 0) {
      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setPagination((prev) => ({ ...prev, total: prev.total - deleted }));
      setSuccess(`Deleted ${deleted} contact${deleted === 1 ? "" : "s"}.`);
    }
    if (errors.length > 0) {
      setError(`${errors.length} deletion${errors.length === 1 ? "" : "s"} failed.`);
    }

    setSelectedIds(new Set());
    setLoading(false);
  }

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-amber-500/20 text-amber-200",
      sent: "bg-blue-500/20 text-blue-200",
      accepted: "bg-emerald-500/20 text-emerald-200",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? "bg-white/10 text-white/60"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filters and actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              // Reset to page 1 when searching
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
            className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>
        <div className="flex gap-2">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v);
              setPagination((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <SelectTrigger size="sm" className="w-auto min-w-[130px] flex-1 sm:flex-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="accepted">Accepted</SelectItem>
            </SelectContent>
          </Select>
          {pendingCount > 0 && (
            <button
              onClick={sendAllPending}
              disabled={loading}
              className="hidden sm:inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Send All ({pendingCount})
            </button>
          )}
        </div>
      </div>

      {/* Mobile send all button */}
      {pendingCount > 0 && (
        <button
          onClick={sendAllPending}
          disabled={loading}
          className="flex sm:hidden w-full h-10 items-center justify-center gap-2 rounded-md bg-white text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
        >
          <Send className="h-4 w-4" />
          Send All Pending ({pendingCount})
        </button>
      )}

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 rounded-lg border border-white/10 bg-white/5 px-3 sm:px-4 py-2">
          <span className="text-sm text-white/60">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => sendInvite(Array.from(selectedIds))}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-3 text-sm hover:bg-white/20 disabled:opacity-60"
            >
              <Mail className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Send Invitations</span>
              <span className="sm:hidden">Send</span>
            </button>
            <button
              onClick={bulkDelete}
              disabled={loading}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-red-500/20 px-3 text-sm text-red-200 hover:bg-red-500/30 disabled:opacity-60"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Delete</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="text-sm text-white/40 hover:text-white/60"
            >
              Clear
            </button>
          </div>
        </div>
      )}

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
      {inviteLinks && inviteLinks.length > 0 && (
        <div className="rounded-md border border-blue-500/20 bg-blue-500/10 px-4 py-3 text-sm">
          <div className="font-medium text-blue-200">Dev Mode: Invite Links</div>
          <div className="mt-2 space-y-2">
            {inviteLinks.map((link, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-white/60 text-xs sm:text-sm truncate">{link.email}:</span>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={link.url}
                    readOnly
                    className="flex-1 min-w-0 rounded border border-white/10 bg-black/30 px-2 py-1 text-xs text-white/80"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(link.url)}
                    className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs hover:bg-white/20"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {contacts.length === 0 && !fetching ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">No contacts found.</p>
          {pagination.total === 0 && (
            <p className="mt-1 text-sm text-white/40">
              Import a CSV to add portfolio companies.
            </p>
          )}
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className={`space-y-3 sm:hidden ${fetching ? "opacity-60" : ""}`}>
            {contacts.map((contact) => (
              <div
                key={contact.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                {editingId === contact.id ? (
                  /* Mobile Edit Form */
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editForm.first_name}
                        onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                        className="h-10 rounded border border-white/10 bg-black/30 px-3 text-sm"
                        placeholder="First name"
                      />
                      <input
                        value={editForm.last_name}
                        onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                        className="h-10 rounded border border-white/10 bg-black/30 px-3 text-sm"
                        placeholder="Last name"
                      />
                    </div>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="h-10 w-full rounded border border-white/10 bg-black/30 px-3 text-sm"
                      placeholder="Email"
                    />
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditingId(null)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-white/10 px-3 text-sm text-white/60"
                      >
                        <X className="h-4 w-4" />
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        disabled={loading}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md bg-white px-3 text-sm font-medium text-black disabled:opacity-60"
                      >
                        <Check className="h-4 w-4" />
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Mobile Contact Card */
                  <>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="mt-1 rounded border-white/20"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {contact.first_name} {contact.last_name}
                            </div>
                            <div className="text-sm text-white/60 truncate">{contact.email}</div>
                          </div>
                          {statusBadge(contact.status)}
                        </div>
                        <div className="mt-2 text-sm text-white/50 truncate">
                          {getCompanyName(contact)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-end gap-1 border-t border-white/5 pt-3">
                      {contact.status !== "accepted" && (
                        <button
                          onClick={() => sendInvite([contact.id])}
                          disabled={loading}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-white/10 disabled:opacity-60"
                          title={contact.status === "sent" ? "Resend" : "Send"}
                        >
                          <Mail className="h-4 w-4 text-white/60" />
                          <span className="text-white/60">{contact.status === "sent" ? "Resend" : "Send"}</span>
                        </button>
                      )}
                      <button
                        onClick={() => startEdit(contact)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4 text-white/60" />
                      </button>
                      <button
                        onClick={() => openDeleteModal(contact)}
                        disabled={loading}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4 text-red-400/60" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className={`hidden sm:block overflow-x-auto rounded-xl border border-white/10 bg-white/5 ${fetching ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-white/60">
                  <th className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.size === contacts.length && contacts.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-white/20"
                    />
                  </th>
                  <th className="p-3 font-medium">Company</th>
                  <th className="p-3 font-medium">Contact</th>
                  <th className="p-3 font-medium">Email</th>
                  <th className="p-3 font-medium">Status</th>
                  <th className="p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((contact) => (
                  <tr key={contact.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(contact.id)}
                        onChange={() => toggleSelect(contact.id)}
                        className="rounded border-white/20"
                      />
                    </td>
                    <td className="p-3 font-medium">{getCompanyName(contact)}</td>
                    <td className="p-3">
                      {editingId === contact.id ? (
                        <div className="flex gap-2">
                          <input
                            value={editForm.first_name}
                            onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                            className="h-8 w-24 rounded border border-white/10 bg-black/30 px-2 text-sm"
                            placeholder="First"
                          />
                          <input
                            value={editForm.last_name}
                            onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                            className="h-8 w-24 rounded border border-white/10 bg-black/30 px-2 text-sm"
                            placeholder="Last"
                          />
                        </div>
                      ) : (
                        `${contact.first_name} ${contact.last_name}`
                      )}
                    </td>
                    <td className="p-3 text-white/60">
                      {editingId === contact.id ? (
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          className="h-8 w-48 rounded border border-white/10 bg-black/30 px-2 text-sm"
                          placeholder="Email"
                        />
                      ) : (
                        contact.email
                      )}
                    </td>
                    <td className="p-3">{statusBadge(contact.status)}</td>
                    <td className="p-3">
                      {editingId === contact.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={saveEdit}
                            disabled={loading}
                            className="text-sm text-emerald-400 hover:text-emerald-300"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-sm text-white/40 hover:text-white/60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          {contact.status !== "accepted" && (
                            <button
                              onClick={() => sendInvite([contact.id])}
                              disabled={loading}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                              title={contact.status === "sent" ? "Resend invitation" : "Send invitation"}
                            >
                              <Mail className="h-4 w-4 text-white/60" />
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(contact)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10"
                            title="Edit contact"
                          >
                            <Pencil className="h-4 w-4 text-white/60" />
                          </button>
                          <button
                            onClick={() => openDeleteModal(contact)}
                            disabled={loading}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-white/10 disabled:opacity-60"
                            title="Delete contact"
                          >
                            <Trash2 className="h-4 w-4 text-red-400/60" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-sm text-white/60 text-center sm:text-left">
            {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(pagination.page - 1)}
              disabled={pagination.page === 1 || fetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum: number;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.page <= 3) {
                  pageNum = i + 1;
                } else if (pagination.page >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    disabled={fetching}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-md text-sm ${
                      pageNum === pagination.page
                        ? "bg-white text-black"
                        : "border border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => goToPage(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages || fetching}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      <ConfirmModal
        open={deleteModal.open}
        title="Delete Contact"
        message={
          deleteModal.contact
            ? `Are you sure you want to delete ${deleteModal.contact.first_name} ${deleteModal.contact.last_name} and their company? This action cannot be undone.`
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

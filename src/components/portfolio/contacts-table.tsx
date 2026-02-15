"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Mail, Pencil, Trash2, Send, Search, ChevronLeft, ChevronRight, X, Check, ArrowUp, ArrowDown, ArrowUpDown, Users, CheckCircle2, Clock } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebounce } from "@/hooks/use-debounce";
import { DownloadCsvButton } from "./download-csv-button";

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
  position: string | null;
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

type SortField = "company" | "contact" | "position" | "email" | "status";
type SortDir = "asc" | "desc";

type Stats = {
  accepted: number;
  awaiting: number;
};

type Props = {
  initialContacts: Contact[];
  initialPagination: Pagination;
  initialStats: Stats;
};

/** Virtualization threshold — only virtualize when row count exceeds this */
const CONTACTS_VIRTUALIZE_THRESHOLD = 30;
/** Estimated row height in pixels for the virtualizer */
const CONTACTS_ESTIMATED_ROW_HEIGHT = 52;
/** Number of columns in the contacts table (checkbox + company + contact + position + email + status + actions) */
const CONTACTS_COL_COUNT = 7;

type ContactsDesktopTableProps = {
  sortedContacts: Contact[];
  contacts: Contact[];
  selectedIds: Set<string>;
  toggleSelectAll: () => void;
  toggleSelect: (id: string) => void;
  toggleSort: (field: SortField) => void;
  sortIcon: (field: SortField) => React.ReactNode;
  editingId: string | null;
  editForm: { first_name: string; last_name: string; email: string; position: string };
  setEditForm: React.Dispatch<React.SetStateAction<{ first_name: string; last_name: string; email: string; position: string }>>;
  saveEdit: () => void;
  setEditingId: React.Dispatch<React.SetStateAction<string | null>>;
  startEdit: (contact: Contact) => void;
  openDeleteModal: (contact: Contact) => void;
  sendInvite: (ids: string[]) => Promise<void>;
  loading: boolean;
  fetching: boolean;
  getCompanyName: (contact: Contact) => string;
  statusBadge: (status: string) => React.ReactNode;
};

function ContactsDesktopTable({
  sortedContacts,
  contacts,
  selectedIds,
  toggleSelectAll,
  toggleSelect,
  toggleSort,
  sortIcon,
  editingId,
  editForm,
  setEditForm,
  saveEdit,
  setEditingId,
  startEdit,
  openDeleteModal,
  sendInvite,
  loading,
  fetching,
  getCompanyName,
  statusBadge,
}: ContactsDesktopTableProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const shouldVirtualize = sortedContacts.length > CONTACTS_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: sortedContacts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => CONTACTS_ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  const renderRow = (contact: Contact) => (
    <>
      <td className="p-3">
        <input
          type="checkbox"
          checked={selectedIds.has(contact.id)}
          onChange={() => toggleSelect(contact.id)}
          className="rounded border-border-default"
        />
      </td>
      <td className="p-3 font-semibold text-text-primary">{getCompanyName(contact)}</td>
      <td className="p-3">
        {editingId === contact.id ? (
          <div className="flex gap-2">
            <input
              value={editForm.first_name}
              onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
              className="h-8 w-24 rounded border border-border-default bg-bg-input px-2 text-sm"
              placeholder="First"
            />
            <input
              value={editForm.last_name}
              onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
              className="h-8 w-24 rounded border border-border-default bg-bg-input px-2 text-sm"
              placeholder="Last"
            />
          </div>
        ) : (
          `${contact.first_name} ${contact.last_name}`
        )}
      </td>
      <td className="p-3 text-text-tertiary">
        {editingId === contact.id ? (
          <input
            value={editForm.position}
            onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
            className="h-8 w-32 rounded border border-border-default bg-bg-input px-2 text-sm"
            placeholder="Position"
          />
        ) : (
          contact.position ?? ""
        )}
      </td>
      <td className="p-3 text-text-tertiary">
        {editingId === contact.id ? (
          <input
            type="email"
            value={editForm.email}
            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
            className="h-8 w-48 rounded border border-border-default bg-bg-input px-2 text-sm"
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
              className="text-sm text-[var(--success-accent)] hover:text-[var(--status-success-text)]"
            >
              Save
            </button>
            <button
              onClick={() => setEditingId(null)}
              className="text-sm text-text-muted hover:text-text-tertiary"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                title={contact.status === "sent" ? "Resend invitation" : "Send invitation"}
                aria-label={contact.status === "sent" ? "Resend invitation" : "Send invitation"}
              >
                <Mail className="h-4 w-4 text-text-tertiary" />
              </button>
            )}
            <button
              onClick={() => startEdit(contact)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              title="Edit contact"
              aria-label="Edit contact"
            >
              <Pencil className="h-4 w-4 text-text-tertiary" />
            </button>
            <button
              onClick={() => openDeleteModal(contact)}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              title="Delete contact"
              aria-label="Delete contact"
            >
              <Trash2 className="h-4 w-4 text-[var(--error-accent)]" />
            </button>
          </div>
        )}
      </td>
    </>
  );

  const theadContent = (
    <tr className="border-b border-border-default text-left text-xs uppercase tracking-wide text-text-muted">
      <th className="p-3">
        <input
          type="checkbox"
          checked={selectedIds.size === contacts.length && contacts.length > 0}
          onChange={toggleSelectAll}
          className="rounded border-border-default"
          aria-label="Select all contacts"
        />
      </th>
      {([
        ["company", "Company"],
        ["contact", "Contact"],
        ["position", "Position"],
        ["email", "Email"],
        ["status", "Status"],
      ] as const).map(([field, label]) => (
        <th key={field} className="p-3 font-medium">
          <button
            type="button"
            onClick={() => toggleSort(field)}
            className="inline-flex items-center gap-1.5 hover:text-text-primary transition-colors"
          >
            {label}
            {sortIcon(field)}
          </button>
        </th>
      ))}
      <th className="p-3 font-medium">Actions</th>
    </tr>
  );

  if (!shouldVirtualize) {
    return (
      <div className={`hidden sm:block overflow-x-auto ${fetching ? "opacity-60" : ""}`}>
        <table className="w-full text-sm">
          <thead>{theadContent}</thead>
          <tbody>
            {sortedContacts.map((contact) => (
              <tr key={contact.id} className="border-b border-border-default last:border-b-0 hover:bg-bg-raised transition-colors">
                {renderRow(contact)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Virtualized rendering
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className={`hidden sm:block max-h-[600px] overflow-auto ${fetching ? "opacity-60" : ""}`}
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-10 bg-[var(--card-bg)]">
          {theadContent}
        </thead>
        <tbody>
          {/* Top spacer */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <tr>
              <td
                colSpan={CONTACTS_COL_COUNT}
                style={{ height: virtualItems[0].start, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const contact = sortedContacts[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="border-b border-border-default last:border-b-0 hover:bg-bg-raised transition-colors"
              >
                {renderRow(contact)}
              </tr>
            );
          })}
          {/* Bottom spacer */}
          {virtualItems.length > 0 && (
            <tr>
              <td
                colSpan={CONTACTS_COL_COUNT}
                style={{
                  height: virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0),
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export function ContactsTable({ initialContacts, initialPagination, initialStats }: Props) {
  const [contacts, setContacts] = React.useState(initialContacts);
  const [pagination, setPagination] = React.useState(initialPagination);
  const [stats, setStats] = React.useState(initialStats);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [sortField, setSortField] = React.useState<SortField>("company");
  const [sortDir, setSortDir] = React.useState<SortDir>("asc");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ first_name: "", last_name: "", email: "", position: "" });
  const [loading, setLoading] = React.useState(false);
  const [fetching, setFetching] = React.useState(false);
  const { error, success, setError, setSuccess } = useToast();
  const [inviteLinks, setInviteLinks] = React.useState<{ email: string; url: string }[] | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  });

  // Debounce search for server-side filtering
  const debouncedSearch = useDebounce(search, 300);

  // Track if this is the initial render to avoid unnecessary fetch
  const isInitialMount = React.useRef(true);

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
          sortField,
          sortDir,
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
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setFetching(false);
      }
    }

    fetchContacts();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, pagination.limit, debouncedSearch, statusFilter, sortField, sortDir]);

  const getCompanyName = (contact: Contact): string => {
    if (!contact.companies) return "";
    if (Array.isArray(contact.companies)) {
      return contact.companies[0]?.name ?? "";
    }
    return contact.companies.name ?? "";
  };

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  }

  function sortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 text-text-faint" />;
    return sortDir === "asc"
      ? <ArrowUp className="h-3 w-3 text-text-tertiary" />
      : <ArrowDown className="h-3 w-3 text-text-tertiary" />;
  }

  // Server-side sorting via API — contacts are already sorted
  const sortedContacts = contacts;

  const pendingCount = React.useMemo(
    () => contacts.filter((c) => c.status === "pending").length,
    [contacts],
  );

  const toggleSelect = React.useCallback((id: string) => {
    setSelectedIds((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(id)) {
        newSelected.delete(id);
      } else {
        newSelected.add(id);
      }
      return newSelected;
    });
  }, []);

  const toggleSelectAll = React.useCallback(() => {
    setSelectedIds((prev) => {
      if (prev.size === contacts.length) {
        return new Set();
      }
      return new Set(contacts.map((c) => c.id));
    });
  }, [contacts]);

  const goToPage = React.useCallback((page: number) => {
    setPagination((prev) => {
      if (page < 1 || page > prev.totalPages) return prev;
      return { ...prev, page };
    });
  }, []);

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
    } catch (err: unknown) {
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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const startEdit = React.useCallback((contact: Contact) => {
    setEditingId(contact.id);
    setEditForm({
      first_name: contact.first_name,
      last_name: contact.last_name,
      email: contact.email,
      position: contact.position ?? "",
    });
  }, []);

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
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  const openDeleteModal = React.useCallback((contact: Contact) => {
    setDeleteModal({ open: true, contact });
  }, []);

  const closeDeleteModal = React.useCallback(() => {
    setDeleteModal({ open: false, contact: null });
  }, []);

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
      setStats((prev) => ({
        accepted: contact.status === "accepted" ? prev.accepted - 1 : prev.accepted,
        awaiting: contact.status === "pending" || contact.status === "sent" ? prev.awaiting - 1 : prev.awaiting,
      }));
      setSuccess("Contact deleted.");
    } catch (err: unknown) {
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
      // Count status breakdown of successfully deleted contacts
      const deletedContacts = contacts.filter((c) => selectedIds.has(c.id));
      const deletedAccepted = deletedContacts.filter((c) => c.status === "accepted").length;
      const deletedAwaiting = deletedContacts.filter((c) => c.status === "pending" || c.status === "sent").length;

      setContacts((prev) => prev.filter((c) => !selectedIds.has(c.id)));
      setPagination((prev) => ({ ...prev, total: prev.total - deleted }));
      setStats((prev) => ({
        accepted: prev.accepted - deletedAccepted,
        awaiting: prev.awaiting - deletedAwaiting,
      }));
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
      pending: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
      sent: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
      accepted: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    };
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${styles[status] ?? "bg-bg-hover text-text-tertiary"}`}>
        {status}
      </span>
    );
  };

  return (
    <div className="space-y-3">
      {/* Contact Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        <div className="rounded-xl card-surface kpi-gradient-blue p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-text-tertiary">
            <Users className="h-4 w-4 text-[var(--info-accent)]" aria-hidden="true" />
            Total Contacts
          </div>
          <div className="mt-1 text-lg sm:text-2xl font-bold">{pagination.total}</div>
          <p className="mt-1 text-xs text-text-muted">All founders in your portfolio</p>
        </div>
        <div className="rounded-xl card-surface kpi-gradient-emerald p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-text-tertiary">
            <CheckCircle2 className="h-4 w-4 text-[var(--success-accent)]" aria-hidden="true" />
            Accepted
          </div>
          <div className="mt-1 text-lg sm:text-2xl font-bold">{stats.accepted}</div>
          <p className="mt-1 text-xs text-text-muted">Founders who joined and can submit metrics</p>
        </div>
        <div className="rounded-xl card-surface kpi-gradient-amber p-3 sm:p-4">
          <div className="flex items-center gap-2 text-xs sm:text-sm text-text-tertiary">
            <Clock className="h-4 w-4 text-[var(--warning-accent)]" aria-hidden="true" />
            Awaiting Response
          </div>
          <div className="mt-1 text-lg sm:text-2xl font-bold">{stats.awaiting}</div>
          <p className="mt-1 text-xs text-text-muted">Pending or sent invitations not yet accepted</p>
        </div>
      </div>

      {/* Messages — float above the card */}
      {error && (
        <div role="alert" className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-4 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}
      {success && (
        <div role="alert" className="rounded-md border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-4 py-2 text-sm text-[var(--status-success-text)]">
          {success}
        </div>
      )}
      {inviteLinks && inviteLinks.length > 0 && (
        <div className="rounded-md border border-[var(--status-info-bg)] bg-[var(--status-info-bg)] px-4 py-3 text-sm">
          <div className="font-medium text-[var(--status-info-text)]">Dev Mode: Invite Links</div>
          <div className="mt-2 space-y-2">
            {inviteLinks.map((link, i) => (
              <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                <span className="text-text-tertiary text-xs sm:text-sm truncate">{link.email}:</span>
                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    value={link.url}
                    readOnly
                    className="flex-1 min-w-0 rounded border border-border-default bg-bg-input px-2 py-1 text-xs text-text-primary"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(link.url)}
                    className="shrink-0 rounded bg-bg-hover px-2 py-1 text-xs hover:bg-bg-hover"
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main card container — filters + table + pagination */}
      <div className="rounded-xl border border-border-default card-surface overflow-hidden">
        {/* Filters header */}
        <div className="flex flex-col gap-3 border-b border-border-subtle px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-[260px]">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search contacts..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className="h-9 w-full rounded-md border border-border-default bg-bg-input pl-8 pr-8 text-sm outline-none placeholder:text-text-faint focus:border-accent focus:ring-2 focus:ring-[var(--ring-focus)]"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-text-muted hover:text-text-secondary"
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
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
            <DownloadCsvButton />
            {pendingCount > 0 && (
              <button
                onClick={sendAllPending}
                disabled={loading}
                className="hidden sm:inline-flex h-9 items-center gap-2 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
              >
                <Send className="h-4 w-4" />
                Send All ({pendingCount})
              </button>
            )}
          </div>
        </div>

        {/* Mobile send all button */}
        {pendingCount > 0 && (
          <div className="border-b border-border-subtle px-4 py-2 sm:hidden">
            <button
              onClick={sendAllPending}
              disabled={loading}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-md bg-btn-primary-bg text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
            >
              <Send className="h-4 w-4" />
              Send All Pending ({pendingCount})
            </button>
          </div>
        )}

        {/* Bulk actions bar */}
        {selectedIds.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 border-b border-border-subtle bg-[var(--accent-subtle)] px-4 py-2">
            <span className="text-sm text-text-secondary font-medium">{selectedIds.size} selected</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => sendInvite(Array.from(selectedIds))}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-bg-hover px-3 text-sm hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
              >
                <Mail className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Send Invitations</span>
                <span className="sm:hidden">Send</span>
              </button>
              <button
                onClick={bulkDelete}
                disabled={loading}
                className="inline-flex h-8 items-center gap-1.5 rounded-md bg-[var(--status-error-bg)] px-3 text-sm text-[var(--status-error-text)] hover:bg-[var(--status-error-bg)] disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--error-border)]"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Delete</span>
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="text-sm text-text-muted hover:text-text-tertiary"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Result count when filtering */}
        {(search || statusFilter !== "all") && contacts.length > 0 && (
          <div className="px-4 pt-3">
            <p className="text-xs text-text-muted">
              Showing {pagination.total} result{pagination.total === 1 ? "" : "s"}
              {search ? ` for "${search}"` : ""}
            </p>
          </div>
        )}

        {/* Content area */}
        {contacts.length === 0 && !fetching ? (
          <div className="px-4 py-8">
            {search || statusFilter !== "all" ? (
              <EmptyState
                variant="no-results"
                title="No results found"
                description={search ? `No matches for "${search}"` : "No contacts match the selected filter"}
                className="border-0 bg-transparent"
              />
            ) : (
              <EmptyState
                title="No contacts found"
                description={
                  pagination.total === 0
                    ? "Import a CSV to add portfolio companies."
                    : undefined
                }
                className="border-0 bg-transparent"
                variant={pagination.total === 0 ? "first-use" : "inline"}
              />
            )}
          </div>
        ) : (
          <>
            {/* Mobile Card View */}
            <div className={`divide-y divide-border-subtle sm:hidden ${fetching ? "opacity-60" : ""}`}>
              {sortedContacts.map((contact) => (
                <div
                  key={contact.id}
                  className="px-4 py-3"
                >
                  {editingId === contact.id ? (
                    /* Mobile Edit Form */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          value={editForm.first_name}
                          onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                          className="h-10 rounded border border-border-default bg-bg-input px-3 text-sm"
                          placeholder="First name"
                        />
                        <input
                          value={editForm.last_name}
                          onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                          className="h-10 rounded border border-border-default bg-bg-input px-3 text-sm"
                          placeholder="Last name"
                        />
                      </div>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="h-10 w-full rounded border border-border-default bg-bg-input px-3 text-sm"
                        placeholder="Email"
                      />
                      <input
                        value={editForm.position}
                        onChange={(e) => setEditForm({ ...editForm, position: e.target.value })}
                        className="h-10 w-full rounded border border-border-default bg-bg-input px-3 text-sm"
                        placeholder="Position (optional)"
                      />
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setEditingId(null)}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-tertiary"
                        >
                          <X className="h-4 w-4" />
                          Cancel
                        </button>
                        <button
                          onClick={saveEdit}
                          disabled={loading}
                          className="inline-flex h-9 items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 text-sm font-medium text-btn-primary-text disabled:opacity-60"
                        >
                          <Check className="h-4 w-4" />
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Mobile Contact Row */
                    <>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(contact.id)}
                          onChange={() => toggleSelect(contact.id)}
                          className="mt-1 rounded border-border-default"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium truncate">
                                {contact.first_name} {contact.last_name}
                              </div>
                              {contact.position && (
                                <div className="text-xs text-text-tertiary truncate">{contact.position}</div>
                              )}
                              <div className="text-sm text-text-tertiary truncate">{contact.email}</div>
                            </div>
                            {statusBadge(contact.status)}
                          </div>
                          <div className="mt-1 text-sm text-text-muted truncate">
                            {getCompanyName(contact)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2 flex items-center justify-end gap-1 pt-2">
                        {contact.status !== "accepted" && (
                          <button
                            onClick={() => sendInvite([contact.id])}
                            disabled={loading}
                            className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-bg-hover disabled:opacity-60"
                            title={contact.status === "sent" ? "Resend" : "Send"}
                          >
                            <Mail className="h-4 w-4 text-text-tertiary" />
                            <span className="text-text-tertiary">{contact.status === "sent" ? "Resend" : "Send"}</span>
                          </button>
                        )}
                        <button
                          onClick={() => startEdit(contact)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                          title="Edit"
                          aria-label="Edit contact"
                        >
                          <Pencil className="h-4 w-4 text-text-tertiary" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(contact)}
                          disabled={loading}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-bg-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
                          title="Delete"
                          aria-label="Delete contact"
                        >
                          <Trash2 className="h-4 w-4 text-[var(--error-accent)]" />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Table View */}
            <ContactsDesktopTable
              sortedContacts={sortedContacts}
              contacts={contacts}
              selectedIds={selectedIds}
              toggleSelectAll={toggleSelectAll}
              toggleSelect={toggleSelect}
              toggleSort={toggleSort}
              sortIcon={sortIcon}
              editingId={editingId}
              editForm={editForm}
              setEditForm={setEditForm}
              saveEdit={saveEdit}
              setEditingId={setEditingId}
              startEdit={startEdit}
              openDeleteModal={openDeleteModal}
              sendInvite={sendInvite}
              loading={loading}
              fetching={fetching}
              getCompanyName={getCompanyName}
              statusBadge={statusBadge}
            />
          </>
        )}

        {/* Pagination footer */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border-subtle px-4 py-3">
            <div className="text-sm text-text-tertiary text-center sm:text-left">
              {(pagination.page - 1) * pagination.limit + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => goToPage(pagination.page - 1)}
                disabled={pagination.page === 1 || fetching}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-default hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
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
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-md text-sm ${
                        pageNum === pagination.page
                          ? "bg-btn-primary-bg text-btn-primary-text"
                          : "hover:bg-bg-hover text-text-secondary"
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
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border-default hover:bg-bg-hover disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

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

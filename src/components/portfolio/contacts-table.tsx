"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Mail, Pencil, Trash2, Send, Search } from "lucide-react";

import { ConfirmModal } from "@/components/ui/confirm-modal";

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

type Props = {
  contacts: Contact[];
};

export function ContactsTable({ contacts: initialContacts }: Props) {
  const router = useRouter();
  const [contacts, setContacts] = React.useState(initialContacts);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("all");
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editForm, setEditForm] = React.useState({ first_name: "", last_name: "", email: "" });
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [deleteModal, setDeleteModal] = React.useState<{ open: boolean; contact: Contact | null }>({
    open: false,
    contact: null,
  });

  // Auto-dismiss success message after 4 seconds
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const getCompanyName = (contact: Contact): string => {
    if (!contact.companies) return "";
    if (Array.isArray(contact.companies)) {
      return contact.companies[0]?.name ?? "";
    }
    return contact.companies.name ?? "";
  };

  const filteredContacts = contacts.filter((c) => {
    const companyName = getCompanyName(c);
    const matchesSearch =
      search === "" ||
      c.first_name.toLowerCase().includes(search.toLowerCase()) ||
      c.last_name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase()) ||
      companyName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "all" || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

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
    if (selectedIds.size === filteredContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredContacts.map((c) => c.id)));
    }
  }

  async function sendInvite(ids: string[]) {
    setLoading(true);
    setError(null);
    setSuccess(null);

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
      router.refresh();

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
      router.refresh();

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
      setSuccess("Contact deleted.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
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
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            placeholder="Search contacts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
        >
          <option value="all">All statuses</option>
          <option value="pending">Pending</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
        </select>
        {pendingCount > 0 && (
          <button
            onClick={sendAllPending}
            disabled={loading}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            Send All Pending ({pendingCount})
          </button>
        )}
      </div>

      {/* Bulk actions */}
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-4 py-2">
          <span className="text-sm text-white/60">{selectedIds.size} selected</span>
          <button
            onClick={() => sendInvite(Array.from(selectedIds))}
            disabled={loading}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-white/10 px-3 text-sm hover:bg-white/20 disabled:opacity-60"
          >
            <Mail className="h-3.5 w-3.5" />
            Send Invitations
          </button>
          <button
            onClick={() => setSelectedIds(new Set())}
            className="text-sm text-white/40 hover:text-white/60"
          >
            Clear
          </button>
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

      {/* Table */}
      {filteredContacts.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">No contacts found.</p>
          {contacts.length === 0 && (
            <p className="mt-1 text-sm text-white/40">
              Import a CSV to add portfolio companies.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-white/60">
                <th className="p-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === filteredContacts.length && filteredContacts.length > 0}
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
              {filteredContacts.map((contact) => (
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

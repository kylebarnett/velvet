"use client";

import * as React from "react";

type Company = {
  id: string;
  name: string;
  stage: string | null;
  industry: string | null;
};

type Props = {
  open: boolean;
  templateId: string;
  templateName: string;
  onClose: () => void;
  onAssigned: () => void;
};

export function TemplateAssignModal({ open, templateId, templateName, onClose, onAssigned }: Props) {
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [periodStart, setPeriodStart] = React.useState("");
  const [periodEnd, setPeriodEnd] = React.useState("");
  const [dueDate, setDueDate] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [loadingCompanies, setLoadingCompanies] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<{ requestsCreated: number; skipped: number } | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setResult(null);
    setError(null);

    async function load() {
      setLoadingCompanies(true);
      try {
        const res = await fetch("/api/investors/companies");
        const json = await res.json().catch(() => null);
        if (json?.companies) {
          setCompanies(json.companies);
        }
      } catch {
        // ignore
      } finally {
        setLoadingCompanies(false);
      }
    }
    load();
  }, [open]);

  React.useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  function toggleCompany(id: string) {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  }

  function selectAll() {
    if (selectedIds.size === companies.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(companies.map((c) => c.id)));
    }
  }

  async function handleAssign() {
    if (selectedIds.size === 0 || !periodStart || !periodEnd) return;
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/investors/metric-templates/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateId,
          companyIds: Array.from(selectedIds),
          periodStart,
          periodEnd,
          dueDate: dueDate || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to assign.");
      setResult({ requestsCreated: json.requestsCreated, skipped: json.skipped });
      onAssigned();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-xl">
        <h2 className="text-lg font-semibold">Assign template</h2>
        <p className="mt-1 text-sm text-white/60">
          Assign &ldquo;{templateName}&rdquo; to portfolio companies.
        </p>

        {result ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
              Created {result.requestsCreated} request{result.requestsCreated !== 1 ? "s" : ""}.
              {result.skipped > 0 && ` ${result.skipped} skipped (already exist).`}
            </div>
            <button
              onClick={onClose}
              className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 focus:outline-none focus:ring-2 focus:ring-white/50"
              type="button"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Company selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-white/70">Companies</label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-white/50 hover:text-white/70"
                >
                  {selectedIds.size === companies.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              {loadingCompanies ? (
                <div className="text-sm text-white/60">Loading...</div>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-white/10 bg-black/30 p-2">
                  {companies.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-white/5"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleCompany(c.id)}
                        className="rounded border-white/20"
                      />
                      <span>{c.name}</span>
                      {c.stage && (
                        <span className="rounded-full bg-white/10 px-1.5 py-0.5 text-xs text-white/60">
                          {c.stage.replace(/_/g, " ")}
                        </span>
                      )}
                    </label>
                  ))}
                  {companies.length === 0 && (
                    <div className="px-2 py-1 text-sm text-white/60">No companies in portfolio.</div>
                  )}
                </div>
              )}
            </div>

            {/* Period */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-white/60">Period start</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-white/60">Period end</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-white/60">Due date (optional)</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none focus:border-white/20"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleAssign}
                disabled={loading || selectedIds.size === 0 || !periodStart || !periodEnd}
                className="inline-flex h-10 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-white/50"
                type="button"
              >
                {loading
                  ? "Assigning..."
                  : `Assign to ${selectedIds.size} compan${selectedIds.size === 1 ? "y" : "ies"}`}
              </button>
              <button
                onClick={onClose}
                className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/20"
                type="button"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

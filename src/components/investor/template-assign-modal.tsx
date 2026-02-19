"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useFocusTrap } from "@/hooks/use-focus-trap";

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
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, open);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter">
      <div ref={dialogRef} className="w-full max-w-lg rounded-xl border border-border-default bg-bg-secondary p-6 shadow-xl modal-dialog-enter" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId} className="text-lg font-semibold">Assign template</h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Assign &ldquo;{templateName}&rdquo; to portfolio companies.
        </p>

        {result ? (
          <div className="mt-4 space-y-3">
            <div className="rounded-md border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-text)]">
              Created {result.requestsCreated} request{result.requestsCreated !== 1 ? "s" : ""}.
              {result.skipped > 0 && ` ${result.skipped} skipped (already exist).`}
            </div>
            <Button
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Company selection */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm text-text-secondary">Companies</label>
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-xs text-text-muted hover:text-text-secondary"
                >
                  {selectedIds.size === companies.length ? "Deselect all" : "Select all"}
                </button>
              </div>
              {loadingCompanies ? (
                <div className="text-sm text-text-tertiary">Loading...</div>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border-default bg-bg-input p-2">
                  {companies.map((c) => (
                    <label
                      key={c.id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-bg-elevated"
                    >
                      <input
                        type="checkbox"
                        checked={selectedIds.has(c.id)}
                        onChange={() => toggleCompany(c.id)}
                        className="rounded border-border-default"
                      />
                      <span>{c.name}</span>
                      {c.stage && (
                        <span className="rounded-full bg-bg-hover px-1.5 py-0.5 text-xs text-text-tertiary">
                          {c.stage.replace(/_/g, " ")}
                        </span>
                      )}
                    </label>
                  ))}
                  {companies.length === 0 && (
                    <div className="px-2 py-1 text-sm text-text-tertiary">No companies in portfolio.</div>
                  )}
                </div>
              )}
            </div>

            {/* Period */}
            <div className="grid gap-3 md:grid-cols-3">
              <div className="grid gap-1.5">
                <label className="text-xs text-text-tertiary">Period start</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-text-tertiary">Period end</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  required
                />
              </div>
              <div className="grid gap-1.5">
                <label className="text-xs text-text-tertiary">Due date (optional)</label>
                <input
                  type="date"
                  className="h-10 rounded-md border border-border-default bg-bg-input px-3 text-sm outline-none focus:border-border-default"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              <Button
                onClick={handleAssign}
                disabled={loading || selectedIds.size === 0 || !periodStart || !periodEnd}
              >
                {loading
                  ? "Assigning..."
                  : `Assign to ${selectedIds.size} compan${selectedIds.size === 1 ? "y" : "ies"}`}
              </Button>
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { getDefaultQuarter } from "@/lib/tear-sheets/quarter-utils";

const QUARTERS = ["Q1", "Q2", "Q3", "Q4"] as const;

type Company = {
  id: string;
  name: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-loaded companies list (approved only). */
  companies: Company[];
  loadingCompanies: boolean;
  /** If set, pre-selects this company. */
  preselectedCompanyId?: string;
  /** Called after successful creation with the new tear sheet. */
  onCreated?: (ts: { id: string; title: string; quarter: string; year: number; company_id: string }) => void;
};

export function NewTearSheetModal({
  open,
  onClose,
  companies,
  loadingCompanies,
  preselectedCompanyId,
  onCreated,
}: Props) {
  const router = useRouter();
  const defaults = getDefaultQuarter();

  const [quarter, setQuarter] = React.useState(defaults.quarter);
  const [year, setYear] = React.useState(defaults.year);
  const [title, setTitle] = React.useState("");
  const [companyId, setCompanyId] = React.useState(preselectedCompanyId ?? "");
  const [creating, setCreating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const titleInputRef = React.useRef<HTMLInputElement>(null);

  // Reset form when modal opens
  React.useEffect(() => {
    if (open) {
      const d = getDefaultQuarter();
      setQuarter(d.quarter);
      setYear(d.year);
      setTitle("");
      setCompanyId(preselectedCompanyId ?? "");
      setCreating(false);
      setError(null);
    }
  }, [open, preselectedCompanyId]);

  // Focus management
  React.useEffect(() => {
    if (!open) return;

    // Small delay to allow portal mount
    const t = setTimeout(() => {
      // Focus first focusable element — will be the select trigger or title input
      const dialog = document.getElementById("new-tear-sheet-dialog");
      if (dialog) {
        const focusable = dialog.querySelector<HTMLElement>(
          "button[role='combobox'], input, button:not([aria-label='Close'])"
        );
        focusable?.focus();
      }
    }, 50);

    return () => clearTimeout(t);
  }, [open]);

  // Escape key
  React.useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  // Lock body scroll
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const defaultTitle = `${quarter} ${year} Update`;
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  async function handleCreate() {
    if (!companyId) {
      setError("Please select a company.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/investors/tear-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          title: title.trim() || defaultTitle,
          quarter,
          year,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to create.");

      onCreated?.({
        id: json.tearSheet.id,
        title: json.tearSheet.title ?? (title.trim() || defaultTitle),
        quarter,
        year,
        company_id: companyId,
      });
      onClose();
      router.push(`/tear-sheets/${json.tearSheet.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="New Tear Sheet"
      id="new-tear-sheet-dialog"
    >
      <div className="relative mx-4 w-full max-w-lg rounded-xl border border-border-default bg-bg-secondary p-6 shadow-2xl">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-lg font-semibold text-text-primary">New Tear Sheet</h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Create an internal investment memo. These are private to you and not visible to founders.
        </p>

        <div className="mt-5 space-y-4">
          {/* Company selector */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-primary">Company</label>
            {loadingCompanies ? (
              <div className="h-11 animate-pulse rounded-md bg-bg-hover" />
            ) : (
              <Select value={companyId} onValueChange={setCompanyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a company..." />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Quarter */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-primary">Quarter</label>
            <div className="flex gap-2">
              {QUARTERS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setQuarter(q)}
                  className={`flex-1 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    quarter === q
                      ? "border-border-default bg-bg-hover text-text-primary"
                      : "border-border-default bg-bg-input text-text-tertiary hover:border-border-default"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          {/* Year */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-primary">Year</label>
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  type="button"
                  onClick={() => setYear(y)}
                  className={`rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                    year === y
                      ? "border-border-default bg-bg-hover text-text-primary"
                      : "border-border-default bg-bg-input text-text-tertiary hover:border-border-default"
                  }`}
                >
                  {y}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="grid gap-2">
            <label className="text-sm font-medium text-text-primary" htmlFor="ts-modal-title">
              Title{" "}
              <span className="font-normal text-text-tertiary">(optional)</span>
            </label>
            <input
              ref={titleInputRef}
              id="ts-modal-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className="h-11 rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
            />
          </div>

          {error && (
            <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border-default px-4 py-2 text-sm font-medium text-text-secondary hover:bg-bg-elevated transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !companyId}
              className="rounded-md bg-btn-primary-bg px-4 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
            >
              {creating ? "Creating..." : "Create Tear Sheet"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

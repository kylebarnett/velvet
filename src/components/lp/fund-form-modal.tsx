"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type FundFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    name: string;
    vintage_year: number;
    fund_size: number | null;
    currency: string;
  };
};

export function FundFormModal({ open, onClose, onSaved, mode, initialValues }: FundFormModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [name, setName] = useState(initialValues?.name ?? "");
  const [vintageYear, setVintageYear] = useState(
    String(initialValues?.vintage_year ?? new Date().getFullYear()),
  );
  const [fundSize, setFundSize] = useState(
    initialValues?.fund_size != null ? String(initialValues.fund_size) : "",
  );
  const [currency, setCurrency] = useState(initialValues?.currency ?? "USD");

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      setName(initialValues?.name ?? "");
      setVintageYear(String(initialValues?.vintage_year ?? new Date().getFullYear()));
      setFundSize(initialValues?.fund_size != null ? String(initialValues.fund_size) : "");
      setCurrency(initialValues?.currency ?? "USD");
      setError(null);
    }
  }, [open, initialValues]);

  // Escape key
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) {
      document.addEventListener("keydown", handleKey);
      return () => document.removeEventListener("keydown", handleKey);
    }
  }, [open, onClose]);

  if (!open) return null;

  async function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    // Validate
    if (!name.trim()) {
      setError("Fund name is required.");
      setSaving(false);
      return;
    }
    const year = parseInt(vintageYear, 10);
    if (isNaN(year) || year < 1990 || year > 2100) {
      setError("Vintage year must be between 1990 and 2100.");
      setSaving(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        vintage_year: year,
        currency,
      };
      if (fundSize.trim() !== "") {
        const size = parseFloat(fundSize);
        if (isNaN(size) || size <= 0) {
          setError("Fund size must be a positive number.");
          setSaving(false);
          return;
        }
        body.fund_size = size;
      }

      const url =
        mode === "edit" && initialValues
          ? `/api/investors/funds/${initialValues.id}`
          : "/api/investors/funds";

      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save fund.");

      onSaved();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Create Fund" : "Edit Fund"}
          </h2>
          <button
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-white/40 hover:bg-white/5 hover:text-white"
            type="button"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
            {error}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Fund Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
              placeholder="e.g. Fund I"
            />
          </div>

          {/* Vintage Year */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Vintage Year</label>
            <input
              value={vintageYear}
              onChange={(e) => setVintageYear(e.target.value)}
              type="number"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
            />
          </div>

          {/* Fund Size */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Fund Size (optional)</label>
            <input
              value={fundSize}
              onChange={(e) => setFundSize(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
              placeholder="e.g. 50000000"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-md border border-white/10 bg-white/5 px-4 text-sm hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-10 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
            >
              {saving ? "Saving..." : mode === "create" ? "Create Fund" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

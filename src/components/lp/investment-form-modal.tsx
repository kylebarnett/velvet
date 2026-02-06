"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

type InvestmentFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  fundId: string;
  companies: { id: string; name: string }[];
  mode: "create" | "edit";
  initialValues?: {
    id: string;
    company_id: string;
    invested_amount: number;
    current_value: number;
    realized_value: number;
    investment_date: string | null;
    notes: string | null;
  };
};

export function InvestmentFormModal({
  open,
  onClose,
  onSaved,
  fundId,
  companies,
  mode,
  initialValues,
}: InvestmentFormModalProps) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [companyId, setCompanyId] = useState(initialValues?.company_id ?? "");
  const [investedAmount, setInvestedAmount] = useState(
    initialValues?.invested_amount != null ? String(initialValues.invested_amount) : "",
  );
  const [currentValue, setCurrentValue] = useState(
    initialValues?.current_value != null ? String(initialValues.current_value) : "",
  );
  const [realizedValue, setRealizedValue] = useState(
    initialValues?.realized_value != null ? String(initialValues.realized_value) : "",
  );
  const [investmentDate, setInvestmentDate] = useState(initialValues?.investment_date ?? "");
  const [notes, setNotes] = useState(initialValues?.notes ?? "");

  useEffect(() => {
    if (open) {
      setCompanyId(initialValues?.company_id ?? "");
      setInvestedAmount(
        initialValues?.invested_amount != null ? String(initialValues.invested_amount) : "",
      );
      setCurrentValue(
        initialValues?.current_value != null ? String(initialValues.current_value) : "",
      );
      setRealizedValue(
        initialValues?.realized_value != null ? String(initialValues.realized_value) : "",
      );
      setInvestmentDate(initialValues?.investment_date ?? "");
      setNotes(initialValues?.notes ?? "");
      setError(null);
    }
  }, [open, initialValues]);

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
    if (!companyId) {
      setError("Please select a company.");
      setSaving(false);
      return;
    }
    const invested = parseFloat(investedAmount);
    if (isNaN(invested) || invested < 0) {
      setError("Invested amount must be a non-negative number.");
      setSaving(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        company_id: companyId,
        invested_amount: invested,
      };
      if (currentValue.trim() !== "") {
        const cv = parseFloat(currentValue);
        if (isNaN(cv) || cv < 0) {
          setError("Current value must be a non-negative number.");
          setSaving(false);
          return;
        }
        body.current_value = cv;
      }
      if (realizedValue.trim() !== "") {
        const rv = parseFloat(realizedValue);
        if (isNaN(rv) || rv < 0) {
          setError("Realized value must be a non-negative number.");
          setSaving(false);
          return;
        }
        body.realized_value = rv;
      }
      if (investmentDate.trim() !== "") {
        body.investment_date = investmentDate;
      }
      if (notes.trim() !== "") {
        body.notes = notes.trim();
      }

      const url =
        mode === "edit" && initialValues
          ? `/api/investors/funds/${fundId}/investments/${initialValues.id}`
          : `/api/investors/funds/${fundId}/investments`;

      const res = await fetch(url, {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Failed to save investment.");

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
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-white/10 bg-zinc-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {mode === "create" ? "Add Investment" : "Edit Investment"}
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
          {/* Company */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Company</label>
            <select
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={mode === "edit"}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none disabled:opacity-60"
            >
              <option value="">Select a company...</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Invested Amount */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Invested Amount</label>
            <input
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
              placeholder="e.g. 1000000"
            />
          </div>

          {/* Current Value */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Current Value</label>
            <input
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Realized Value */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Realized Value</label>
            <input
              value={realizedValue}
              onChange={(e) => setRealizedValue(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Investment Date */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Investment Date (optional)</label>
            <input
              value={investmentDate}
              onChange={(e) => setInvestmentDate(e.target.value)}
              type="date"
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm focus:border-white/20 focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm text-white/70">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm focus:border-white/20 focus:outline-none"
              placeholder="Any additional notes..."
              maxLength={1000}
            />
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
              {saving ? "Saving..." : mode === "create" ? "Add Investment" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

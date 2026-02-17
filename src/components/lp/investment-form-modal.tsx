"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

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
  const titleId = useId();
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

    // Validate
    if (!companyId) {
      toast.error("Please select a company.");
      setSaving(false);
      return;
    }
    const invested = parseFloat(investedAmount);
    if (isNaN(invested) || invested < 0) {
      toast.error("Invested amount must be a non-negative number.");
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
          toast.error("Current value must be a non-negative number.");
          setSaving(false);
          return;
        }
        body.current_value = cv;
      }
      if (realizedValue.trim() !== "") {
        const rv = parseFloat(realizedValue);
        if (isNaN(rv) || rv < 0) {
          toast.error("Realized value must be a non-negative number.");
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
      toast.error(err instanceof Error ? err.message : "An error occurred.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      ref={backdropRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
      onClick={(e) => {
        if (e.target === backdropRef.current) onClose();
      }}
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border-default bg-bg-secondary p-6 modal-dialog-enter" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {mode === "create" ? "Add Investment" : "Edit Investment"}
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <form onSubmit={handleFormSubmit} className="mt-4 space-y-4">
          {/* Company */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Company</label>
            <Select
              value={companyId || NONE}
              onValueChange={(v) => setCompanyId(v === NONE ? "" : v)}
              disabled={mode === "edit"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a company..." />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value={NONE}>Select a company...</SelectItem>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Invested Amount */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Invested Amount</label>
            <input
              value={investedAmount}
              onChange={(e) => setInvestedAmount(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="e.g. 1000000"
            />
          </div>

          {/* Current Value */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Current Value</label>
            <input
              value={currentValue}
              onChange={(e) => setCurrentValue(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Realized Value */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Realized Value</label>
            <input
              value={realizedValue}
              onChange={(e) => setRealizedValue(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="0"
            />
          </div>

          {/* Investment Date */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Investment Date (optional)</label>
            <input
              value={investmentDate}
              onChange={(e) => setInvestmentDate(e.target.value)}
              type="date"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="min-h-[80px] w-full rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm focus:border-border-default focus:outline-none"
              placeholder="Any additional notes..."
              maxLength={1000}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              loading={saving}
            >
              {mode === "create" ? "Add Investment" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

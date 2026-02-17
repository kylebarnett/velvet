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
  const titleId = useId();
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

    // Validate
    if (!name.trim()) {
      toast.error("Fund name is required.");
      setSaving(false);
      return;
    }
    const year = parseInt(vintageYear, 10);
    if (isNaN(year) || year < 1990 || year > 2100) {
      toast.error("Vintage year must be between 1990 and 2100.");
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
          toast.error("Fund size must be a positive number.");
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
      <div className="w-full max-w-md rounded-xl border border-border-default bg-bg-secondary p-6 modal-dialog-enter" role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-lg font-semibold">
            {mode === "create" ? "Create Fund" : "Edit Fund"}
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
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Fund Name<span className="text-[var(--error-accent)]"> *</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="e.g. Fund I"
            />
          </div>

          {/* Vintage Year */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Vintage Year</label>
            <input
              value={vintageYear}
              onChange={(e) => setVintageYear(e.target.value)}
              type="number"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
            />
          </div>

          {/* Fund Size */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Fund Size (optional)</label>
            <input
              value={fundSize}
              onChange={(e) => setFundSize(e.target.value)}
              type="number"
              step="any"
              className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm focus:border-border-default focus:outline-none"
              placeholder="e.g. 50000000"
            />
          </div>

          {/* Currency */}
          <div>
            <label className="mb-1 block text-sm text-text-secondary">Currency</label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent portal={false}>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="EUR">EUR</SelectItem>
                <SelectItem value="GBP">GBP</SelectItem>
              </SelectContent>
            </Select>
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
              {mode === "create" ? "Create Fund" : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

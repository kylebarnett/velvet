"use client";

import * as React from "react";
import { X, RotateCcw, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type MetricOption = {
  name: string;
  displayName: string;
};

type TileMetricConfigProps = {
  open: boolean;
  companyId: string;
  companyName: string;
  availableMetrics: MetricOption[];
  initialPrimary: string | null;
  initialSecondary: string | null;
  onClose: () => void;
  onSave: (primary: string | null, secondary: string | null) => void;
};

export function TileMetricConfig({
  open,
  companyId,
  companyName,
  availableMetrics,
  initialPrimary,
  initialSecondary,
  onClose,
  onSave,
}: TileMetricConfigProps) {
  const [primaryMetric, setPrimaryMetric] = React.useState<string | null>(initialPrimary);
  const [secondaryMetric, setSecondaryMetric] = React.useState<string | null>(initialSecondary);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset state when modal opens
  React.useEffect(() => {
    if (open) {
      setPrimaryMetric(initialPrimary);
      setSecondaryMetric(initialSecondary);
      setError(null);
    }
  }, [open, initialPrimary, initialSecondary]);

  // Close on escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && open) {
        onClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleSave() {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/investors/companies/${companyId}/tile-metrics`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          primaryMetric,
          secondaryMetric: primaryMetric ? secondaryMetric : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save preferences");
      }

      onSave(primaryMetric, secondaryMetric);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save preferences");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setPrimaryMetric(null);
    setSecondaryMetric(null);
  }

  function handlePrimaryChange(value: string) {
    if (value === "__default__") {
      setPrimaryMetric(null);
      setSecondaryMetric(null);
    } else {
      setPrimaryMetric(value);
      // Clear secondary if it's the same as new primary
      if (secondaryMetric === value) {
        setSecondaryMetric(null);
      }
    }
  }

  if (!open) return null;

  const hasChanges = primaryMetric !== initialPrimary || secondaryMetric !== initialSecondary;
  const secondaryOptions = availableMetrics.filter(
    (m) => m.name.toLowerCase() !== primaryMetric?.toLowerCase()
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-xl border border-white/10 bg-zinc-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">Tile Metrics</h3>
            <p className="mt-1 text-sm text-white/60">
              Choose which metrics appear on the {companyName} tile in your dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-white/40 hover:bg-white/10 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 space-y-4">
          {/* Primary metric selector */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Primary Metric
            </label>
            <Select
              value={primaryMetric ?? "__default__"}
              onValueChange={handlePrimaryChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Use default (auto-select)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__default__">Use default (auto-select)</SelectItem>
                {availableMetrics.map((m) => (
                  <SelectItem key={m.name} value={m.name.toLowerCase()}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="mt-1 text-xs text-white/40">
              If not set, the most relevant metric will be shown automatically.
            </p>
          </div>

          {/* Secondary metric selector */}
          <div>
            <label className="block text-sm font-medium text-white/80 mb-1.5">
              Secondary Metric
              <span className="ml-1 text-white/40">(optional)</span>
            </label>
            <Select
              value={secondaryMetric ?? "__none__"}
              onValueChange={(v) => setSecondaryMetric(v === "__none__" ? null : v)}
              disabled={!primaryMetric}
            >
              <SelectTrigger>
                <SelectValue placeholder="None" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {secondaryOptions.map((m) => (
                  <SelectItem key={m.name} value={m.name.toLowerCase()}>
                    {m.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!primaryMetric && (
              <p className="mt-1 text-xs text-white/40">
                Select a primary metric first to enable secondary.
              </p>
            )}
          </div>

          {/* Reset button */}
          {(primaryMetric || secondaryMetric) && (
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset to default
            </button>
          )}

          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {error}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 bg-white/5 px-4 text-sm font-medium text-white hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

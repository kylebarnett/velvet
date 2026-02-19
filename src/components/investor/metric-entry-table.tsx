"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { X, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { METRIC_DEFINITIONS, inferMetricValueType, formatMetricDisplayName } from "@/lib/metric-definitions";
import {
  type Period,
  generateQuarterlyPeriods,
  generateMonthlyPeriods,
  generateAnnualPeriods,
} from "@/lib/utils/period-generator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type PeriodGranularity = "quarterly" | "monthly" | "annual";
type YearRange = 1 | 2 | 3 | 5;
type Step = "configure" | "table";

type Props = {
  open: boolean;
  onClose: () => void;
  companyId: string;
  companyName: string;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const GRANULARITY_TABS: TabItem<PeriodGranularity>[] = [
  { value: "quarterly", label: "Quarterly" },
  { value: "monthly", label: "Monthly" },
  { value: "annual", label: "Annual" },
];

const YEAR_RANGE_OPTIONS: { value: YearRange; label: string }[] = [
  { value: 1, label: "1 yr" },
  { value: 2, label: "2 yr" },
  { value: 3, label: "3 yr" },
  { value: 5, label: "5 yr" },
];

const METRIC_NAMES = Object.keys(METRIC_DEFINITIONS);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getColumnCount(granularity: PeriodGranularity, years: YearRange): number {
  if (granularity === "quarterly") return years * 4;
  if (granularity === "monthly") return years * 12;
  return years;
}

function getColumnCountLabel(granularity: PeriodGranularity, years: YearRange): string {
  const count = getColumnCount(granularity, years);
  if (granularity === "quarterly") return `${count} quarters`;
  if (granularity === "monthly") return `${count} months`;
  return `${count} year${count > 1 ? "s" : ""}`;
}

function generatePeriods(granularity: PeriodGranularity, years: YearRange): Period[] {
  const count = getColumnCount(granularity, years);
  let periods: Period[];
  if (granularity === "quarterly") {
    periods = generateQuarterlyPeriods(null, count);
  } else if (granularity === "monthly") {
    periods = generateMonthlyPeriods(null, count);
  } else {
    periods = generateAnnualPeriods(null, count);
  }
  // Reverse for chronological order (oldest first, left-to-right)
  return periods.reverse();
}

function getFormatHint(metricName: string): string {
  const lower = metricName.toLowerCase();
  if (
    /revenue|mrr|arr|burn|cost|expense|spend|salary|cogs|gmv|aov|arpu|ltv|cac|cash|invested|valuation|balance|debt|capital|profit|ebitda|income/.test(
      lower,
    )
  ) {
    return "e.g. 50000";
  }
  if (
    /rate|margin|retention|churn|conversion|ratio|nrr|grr|nps|score|percent|utilization/.test(
      lower,
    )
  ) {
    return "e.g. 45.2";
  }
  return "e.g. 1000";
}

function isValidNumericValue(val: string): boolean {
  if (!val.trim()) return true; // empty is OK
  return /^-?\d+(\.\d+)?$/.test(val.trim());
}

// ---------------------------------------------------------------------------
// MetricSearchInput — searchable metric dropdown with tag chips
// ---------------------------------------------------------------------------

function MetricSearchInput({
  selected,
  onAdd,
  onRemove,
}: {
  selected: string[];
  onAdd: (name: string) => void;
  onRemove: (name: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return METRIC_NAMES.filter((n) => !selected.includes(n)).slice(0, 20);
    return METRIC_NAMES.filter(
      (n) => n.toLowerCase().includes(lower) && !selected.includes(n),
    );
  }, [query, selected]);

  const hasExactMatch = filtered.some((n) => n.toLowerCase() === query.toLowerCase().trim());
  const showCustomOption = query.trim().length > 0 && !hasExactMatch && !selected.includes(query.trim());

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(name: string) {
    onAdd(name);
    setQuery("");
    inputRef.current?.focus();
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1.5 block text-sm font-medium text-text-secondary">
        Metrics
      </label>

      {/* Tag chips */}
      {selected.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {selected.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-1 rounded-md bg-[var(--tag-blue-bg)] px-2 py-1 text-xs font-medium text-[var(--tag-blue-text)]"
            >
              {name}
              <button
                type="button"
                onClick={() => onRemove(name)}
                className="ml-0.5 rounded-sm hover:text-text-primary"
                aria-label={`Remove ${name}`}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              if (filtered.length > 0) {
                handleSelect(filtered[0]);
              } else if (showCustomOption) {
                handleSelect(query.trim());
              }
            }
          }}
          placeholder="Search metrics..."
          className="h-11 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
        />
      </div>

      {/* Dropdown */}
      {showDropdown && (filtered.length > 0 || showCustomOption) && (
        <div className="absolute z-50 mt-1 max-h-[240px] w-full overflow-y-auto rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm">
          {filtered.slice(0, 20).map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              {name}
            </button>
          ))}
          {showCustomOption && (
            <button
              type="button"
              onClick={() => handleSelect(query.trim())}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add custom: &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineMetricSearch — for adding metrics from within the table
// ---------------------------------------------------------------------------

function InlineMetricSearch({
  selected,
  onAdd,
}: {
  selected: string[];
  onAdd: (name: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const filtered = React.useMemo(() => {
    const lower = query.toLowerCase().trim();
    if (!lower) return METRIC_NAMES.filter((n) => !selected.includes(n)).slice(0, 10);
    return METRIC_NAMES.filter(
      (n) => n.toLowerCase().includes(lower) && !selected.includes(n),
    ).slice(0, 10);
  }, [query, selected]);

  const hasExactMatch = filtered.some((n) => n.toLowerCase() === query.toLowerCase().trim());
  const showCustomOption = query.trim().length > 0 && !hasExactMatch && !selected.includes(query.trim());

  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelect(name: string) {
    onAdd(name);
    setQuery("");
    setShowDropdown(false);
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Plus className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-faint" aria-hidden="true" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && query.trim()) {
              e.preventDefault();
              if (filtered.length > 0) {
                handleSelect(filtered[0]);
              } else if (showCustomOption) {
                handleSelect(query.trim());
              }
            }
          }}
          placeholder="Add metric..."
          className="h-9 w-48 rounded-md border border-border-default bg-bg-input pl-8 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
        />
      </div>
      {showDropdown && (filtered.length > 0 || showCustomOption) && (
        <div className="absolute bottom-full z-50 mb-1 max-h-[200px] w-64 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm">
          {filtered.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => handleSelect(name)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              {name}
            </button>
          ))}
          {showCustomOption && (
            <button
              type="button"
              onClick={() => handleSelect(query.trim())}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add custom: &ldquo;{query.trim()}&rdquo;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SpreadsheetTable
// ---------------------------------------------------------------------------

function SpreadsheetTable({
  metrics,
  periods,
  cellValues,
  existingValues,
  onCellChange,
  onRemoveMetric,
  onAddMetric,
}: {
  metrics: string[];
  periods: Period[];
  cellValues: Record<string, Record<string, string>>;
  existingValues: Record<string, Record<string, string>>;
  onCellChange: (metric: string, periodKey: string, value: string) => void;
  onRemoveMetric: (metric: string) => void;
  onAddMetric: (name: string) => void;
}) {
  const tableRef = React.useRef<HTMLDivElement>(null);

  function focusCell(row: number, col: number) {
    if (row < 0 || row >= metrics.length || col < 0 || col >= periods.length) return;
    const cell = document.getElementById(`cell-${row}-${col}`);
    cell?.focus();
  }

  function handleCellKeyDown(e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) {
    const input = e.currentTarget;
    if (e.key === "Enter") {
      e.preventDefault();
      focusCell(row + 1, col);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focusCell(row + 1, col);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focusCell(row - 1, col);
    } else if (e.key === "ArrowRight" && input.selectionStart === input.value.length) {
      e.preventDefault();
      focusCell(row, col + 1);
    } else if (e.key === "ArrowLeft" && input.selectionStart === 0) {
      e.preventDefault();
      focusCell(row, col - 1);
    } else if (e.key === "Tab") {
      e.preventDefault();
      if (e.shiftKey) {
        // Move left, wrap to previous row
        if (col > 0) {
          focusCell(row, col - 1);
        } else if (row > 0) {
          focusCell(row - 1, periods.length - 1);
        }
      } else {
        // Move right, wrap to next row
        if (col < periods.length - 1) {
          focusCell(row, col + 1);
        } else if (row < metrics.length - 1) {
          focusCell(row + 1, 0);
        }
      }
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={tableRef} className="overflow-auto rounded-lg border border-border-default">
        <table className="w-full border-collapse">
          {/* Header row */}
          <thead>
            <tr>
              <th className="sticky left-0 z-20 min-w-[180px] border-b border-r border-border-default bg-bg-elevated px-3 py-2 text-left text-xs font-medium text-text-tertiary">
                Metric
              </th>
              {periods.map((p) => (
                <th
                  key={p.key}
                  className="sticky top-0 z-10 min-w-[110px] border-b border-border-default bg-bg-elevated px-2 py-2 text-center text-xs font-medium text-text-tertiary"
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((metric, rowIdx) => (
              <tr key={metric} className="group">
                {/* Metric name cell (sticky) */}
                <td className="sticky left-0 z-10 border-b border-r border-border-default bg-bg-primary px-3 py-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-sm font-medium text-text-primary" title={formatMetricDisplayName(metric)}>
                      {formatMetricDisplayName(metric)}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveMetric(metric)}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-faint opacity-0 transition-opacity hover:text-[var(--error-accent)] group-hover:opacity-100"
                      aria-label={`Remove ${metric}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                </td>
                {/* Value cells */}
                {periods.map((p, colIdx) => {
                  const val = cellValues[metric]?.[p.key] ?? "";
                  const existing = existingValues[metric]?.[p.key] ?? "";
                  const isInvalid = val.trim() !== "" && !isValidNumericValue(val);
                  return (
                    <td
                      key={p.key}
                      className="border-b border-border-default px-1 py-1"
                    >
                      <input
                        id={`cell-${rowIdx}-${colIdx}`}
                        type="text"
                        inputMode="decimal"
                        value={val}
                        onChange={(e) => onCellChange(metric, p.key, e.target.value)}
                        onKeyDown={(e) => handleCellKeyDown(e, rowIdx, colIdx)}
                        placeholder={existing || getFormatHint(metric)}
                        className={`h-9 w-full rounded-md border bg-bg-input px-2 text-right text-sm tabular-nums outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)] focus:ring-1 focus:ring-[var(--ring-focus)] ${
                          isInvalid
                            ? "border-[var(--error-border)] text-[var(--error-accent)]"
                            : "border-border-default text-text-primary"
                        }`}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add metric row */}
      <InlineMetricSearch selected={metrics} onAdd={onAddMetric} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// MetricEntryModal — main export
// ---------------------------------------------------------------------------

export function MetricEntryModal({ open, onClose, companyId, companyName }: Props) {
  const router = useRouter();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const titleId = React.useId();

  // Config state
  const [step, setStep] = React.useState<Step>("configure");
  const [granularity, setGranularity] = React.useState<PeriodGranularity>("quarterly");
  const [yearRange, setYearRange] = React.useState<YearRange>(2);
  const [selectedMetrics, setSelectedMetrics] = React.useState<string[]>([]);

  // Table state
  const [cellValues, setCellValues] = React.useState<Record<string, Record<string, string>>>({});
  const [existingValues, setExistingValues] = React.useState<Record<string, Record<string, string>>>({});
  const [periods, setPeriods] = React.useState<Period[]>([]);
  const [saving, setSaving] = React.useState(false);

  // Confirmation modal
  const [pendingGranularity, setPendingGranularity] = React.useState<PeriodGranularity | null>(null);
  const [showCloseConfirm, setShowCloseConfirm] = React.useState(false);

  const hasUnsavedChanges = React.useMemo(() => {
    return Object.values(cellValues).some((row) =>
      Object.values(row).some((v) => v.trim() !== ""),
    );
  }, [cellValues]);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setStep("configure");
      setGranularity("quarterly");
      setYearRange(2);
      setSelectedMetrics([]);
      setCellValues({});
      setExistingValues({});
      setPeriods([]);
      setSaving(false);
    }
  }, [open]);

  // Focus trap
  React.useEffect(() => {
    if (!open) return;
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [open]);

  // Escape key
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (step === "table" && hasUnsavedChanges) {
          setShowCloseConfirm(true);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, step, hasUnsavedChanges]);

  // beforeunload
  React.useEffect(() => {
    if (!open || step !== "table" || !hasUnsavedChanges) return;
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [open, step, hasUnsavedChanges]);

  // Fetch existing metrics when building table
  async function fetchExisting(metricsToFetch: string[], periodsToCheck: Period[]) {
    try {
      const res = await fetch(`/api/investors/companies/${companyId}/metrics`);
      if (!res.ok) return;
      const data = await res.json();
      const existing: Record<string, Record<string, string>> = {};
      const allMetrics = data.metrics ?? [];

      for (const m of allMetrics) {
        const name = m.metric_name;
        if (!metricsToFetch.includes(name)) continue;
        const periodKey = m.period_start;
        if (!periodsToCheck.some((p) => p.key === periodKey)) continue;
        if (!existing[name]) existing[name] = {};
        const rawVal = m.value?.raw ?? m.value?.value ?? "";
        existing[name][periodKey] = String(rawVal);
      }

      setExistingValues(existing);

      // Pre-populate cellValues with existing data
      setCellValues((prev) => {
        const next = { ...prev };
        for (const [name, periods] of Object.entries(existing)) {
          if (!next[name]) next[name] = {};
          for (const [periodKey, val] of Object.entries(periods)) {
            // Only pre-populate if user hasn't typed anything yet
            if (!next[name][periodKey]) {
              next[name][periodKey] = val;
            }
          }
        }
        return next;
      });
    } catch {
      // Silently fail — user can still enter data
    }
  }

  function handleBuildTable() {
    const newPeriods = generatePeriods(granularity, yearRange);
    setPeriods(newPeriods);
    setCellValues({});
    setExistingValues({});
    setStep("table");
    fetchExisting(selectedMetrics, newPeriods);
  }

  function handleGranularityChange(newGranularity: PeriodGranularity) {
    if (step === "table" && hasUnsavedChanges) {
      setPendingGranularity(newGranularity);
    } else {
      applyGranularityChange(newGranularity);
    }
  }

  function applyGranularityChange(newGranularity: PeriodGranularity) {
    setGranularity(newGranularity);
    if (step === "table") {
      const newPeriods = generatePeriods(newGranularity, yearRange);
      setPeriods(newPeriods);
      setCellValues({});
      setExistingValues({});
      fetchExisting(selectedMetrics, newPeriods);
    }
  }

  function handleYearRangeChange(newRange: YearRange) {
    setYearRange(newRange);
    if (step === "table") {
      const newPeriods = generatePeriods(granularity, newRange);
      setPeriods(newPeriods);
      // Preserve existing cell values for periods that still exist
      setCellValues((prev) => {
        const newKeys = new Set(newPeriods.map((p) => p.key));
        const next: Record<string, Record<string, string>> = {};
        for (const [metric, periods] of Object.entries(prev)) {
          next[metric] = {};
          for (const [key, val] of Object.entries(periods)) {
            if (newKeys.has(key)) next[metric][key] = val;
          }
        }
        return next;
      });
      fetchExisting(selectedMetrics, newPeriods);
    }
  }

  function handleCellChange(metric: string, periodKey: string, value: string) {
    setCellValues((prev) => ({
      ...prev,
      [metric]: { ...prev[metric], [periodKey]: value },
    }));
  }

  function handleRemoveMetric(metric: string) {
    setSelectedMetrics((prev) => prev.filter((m) => m !== metric));
    setCellValues((prev) => {
      const next = { ...prev };
      delete next[metric];
      return next;
    });
  }

  function handleAddMetricInTable(name: string) {
    if (selectedMetrics.includes(name)) return;
    setSelectedMetrics((prev) => [...prev, name]);
    // Fetch existing data for this new metric
    if (periods.length > 0) {
      fetchExisting([...selectedMetrics, name], periods);
    }
  }

  function handleAttemptClose() {
    if (step === "table" && hasUnsavedChanges) {
      setShowCloseConfirm(true);
    } else {
      onClose();
    }
  }

  async function handleSave() {
    // Collect changed cells
    const metricsToSave: {
      metric_name: string;
      value: string;
      period_type: PeriodGranularity;
      period_start: string;
    }[] = [];

    for (const metric of selectedMetrics) {
      for (const period of periods) {
        const val = cellValues[metric]?.[period.key]?.trim();
        if (!val) continue;

        // Skip if value matches existing (no change)
        const existingVal = existingValues[metric]?.[period.key];
        if (existingVal === val) continue;

        if (!isValidNumericValue(val)) {
          toast.error(`Invalid value for ${metric} (${period.label}): "${val}"`);
          return;
        }

        metricsToSave.push({
          metric_name: metric,
          value: val,
          period_type: granularity,
          period_start: period.key,
        });
      }
    }

    if (metricsToSave.length === 0) {
      toast.error("No new or changed values to save.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/investors/companies/${companyId}/metrics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metrics: metricsToSave }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error ?? "Failed to save metrics.");
      }
      toast.success(`${json.count} metric value${json.count === 1 ? "" : "s"} saved.`);
      onClose();
      router.refresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) return null;

  const changedCount = (() => {
    let count = 0;
    for (const metric of selectedMetrics) {
      for (const period of periods) {
        const val = cellValues[metric]?.[period.key]?.trim();
        if (!val) continue;
        const existingVal = existingValues[metric]?.[period.key];
        if (existingVal !== val) count++;
      }
    }
    return count;
  })();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter"
        onClick={handleAttemptClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative mx-4 w-full rounded-xl border border-border-default bg-bg-secondary p-6 shadow-2xl modal-dialog-enter ${
          step === "table" ? "max-w-6xl" : "max-w-lg"
        } max-h-[90vh] flex flex-col`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-text-primary">
              {step === "configure" ? "Configure Metric Table" : "Enter Metrics"}
            </h2>
            <p className="text-sm text-text-tertiary">
              {companyName}
            </p>
          </div>
          <button
            type="button"
            onClick={handleAttemptClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-elevated hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Step 1: Configuration */}
        {step === "configure" && (
          <div className="mt-5 space-y-5">
            {/* Period granularity */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Period type
              </label>
              <SlidingTabs
                tabs={GRANULARITY_TABS}
                value={granularity}
                onChange={setGranularity}
                size="sm"
              />
            </div>

            {/* Year range */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Time range
              </label>
              <div className="flex gap-2">
                {YEAR_RANGE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setYearRange(opt.value)}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                      yearRange === opt.value
                        ? "border-[var(--ring-focus)] bg-bg-elevated text-text-primary"
                        : "border-border-default text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-text-faint">
                {getColumnCountLabel(granularity, yearRange)}
              </p>
            </div>

            {/* Metric search */}
            <MetricSearchInput
              selected={selectedMetrics}
              onAdd={(name) => setSelectedMetrics((prev) => [...prev, name])}
              onRemove={(name) => setSelectedMetrics((prev) => prev.filter((m) => m !== name))}
            />

            {/* Build Table button */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button variant="secondary" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleBuildTable}
                disabled={selectedMetrics.length === 0}
              >
                Build Table
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Spreadsheet */}
        {step === "table" && (
          <div className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-hidden">
            {/* Controls above table */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <SlidingTabs
                  tabs={GRANULARITY_TABS}
                  value={granularity}
                  onChange={handleGranularityChange}
                  size="sm"
                  />
                <div className="flex gap-1">
                  {YEAR_RANGE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleYearRangeChange(opt.value)}
                      className={`rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                        yearRange === opt.value
                          ? "bg-bg-elevated text-text-primary"
                          : "text-text-tertiary hover:text-text-secondary"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStep("configure")}
                className="text-sm text-text-tertiary hover:text-text-secondary"
              >
                Back to config
              </button>
            </div>

            {/* Table */}
            <div className="min-h-0 flex-1 overflow-auto">
              <SpreadsheetTable
                metrics={selectedMetrics}
                periods={periods}
                cellValues={cellValues}
                existingValues={existingValues}
                onCellChange={handleCellChange}
                onRemoveMetric={handleRemoveMetric}
                onAddMetric={handleAddMetricInTable}
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border-default pt-3">
              <p className="text-xs text-text-faint">
                {changedCount > 0
                  ? `${changedCount} value${changedCount === 1 ? "" : "s"} to save`
                  : "No changes yet"}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="secondary" type="button" onClick={handleAttemptClose}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSave}
                  loading={saving}
                  disabled={changedCount === 0}
                >
                  Save {changedCount > 0 ? `(${changedCount})` : ""}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirm granularity change */}
      <ConfirmModal
        open={pendingGranularity !== null}
        title="Change period type?"
        message="Switching period types will clear your unsaved values. Continue?"
        confirmLabel="Switch"
        variant="warning"
        onConfirm={() => {
          if (pendingGranularity) applyGranularityChange(pendingGranularity);
          setPendingGranularity(null);
        }}
        onCancel={() => setPendingGranularity(null)}
      />

      {/* Confirm close with unsaved changes */}
      <ConfirmModal
        open={showCloseConfirm}
        title="Discard unsaved changes?"
        message="You have unsaved metric values. Are you sure you want to close?"
        confirmLabel="Discard"
        variant="danger"
        onConfirm={() => {
          setShowCloseConfirm(false);
          onClose();
        }}
        onCancel={() => setShowCloseConfirm(false)}
      />
    </div>,
    document.body,
  );
}

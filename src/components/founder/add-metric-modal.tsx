"use client";

import * as React from "react";
import * as ReactDOM from "react-dom";
import { X, Plus, Trash2, Info, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SlidingTabs, type TabItem } from "@/components/ui/sliding-tabs";
import {
  METRIC_DEFINITIONS,
  getMetricDefinition,
  resolveMetricDefinition,
  inferMetricValueType,
} from "@/lib/metric-definitions";
import { useAIMetricDefinition } from "@/hooks/use-ai-metric-definition";
import { useMetricDefinitions } from "@/contexts/metric-definitions-context";
import {
  type Period,
  generateMonthlyPeriods,
  generateQuarterlyPeriods,
  generateAnnualPeriods,
} from "@/lib/utils/period-generator";

type PeriodType = "monthly" | "quarterly" | "annual";

type PeriodRow = {
  id: string;
  periodKey: string;
  value: string;
};

type AddMetricModalProps = {
  open: boolean;
  companyId: string;
  existingMetricNames: string[];
  onClose: () => void;
  onSubmitted: () => void;
};

let nextRowId = 0;
function makeRowId() {
  return `row-${++nextRowId}`;
}

function generatePeriods(periodType: PeriodType): Period[] {
  switch (periodType) {
    case "monthly":
      return generateMonthlyPeriods(null, 24);
    case "quarterly":
      return generateQuarterlyPeriods(null, 12);
    case "annual":
      return generateAnnualPeriods(null, 5);
  }
}

const periodTypeTabs: TabItem<PeriodType>[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

/** Custom styled dropdown that replaces native <select>.
 *  Uses fixed positioning so it isn't clipped by overflow containers. */
function PeriodDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Period[];
  onChange: (key: string) => void;
}) {
  const [isOpen, setIsOpen] = React.useState(false);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLUListElement>(null);
  const [pos, setPos] = React.useState({ top: 0, left: 0, width: 0 });
  const selected = options.find((p) => p.key === value);

  // Position the menu below the trigger button
  React.useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [isOpen]);

  // Close on click outside
  React.useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        buttonRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) return;
      setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  // Close when the modal scrolls so the menu doesn't float detached
  React.useEffect(() => {
    if (!isOpen || !buttonRef.current) return;
    const scrollParent = buttonRef.current.closest("[data-scroll-body]");
    if (!scrollParent) return;
    function handleScroll() { setIsOpen(false); }
    scrollParent.addEventListener("scroll", handleScroll, { passive: true });
    return () => scrollParent.removeEventListener("scroll", handleScroll);
  }, [isOpen]);

  return (
    <div className="relative w-32 shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="flex h-10 w-full items-center justify-between rounded-md border border-border-default bg-bg-input px-2.5 text-sm text-text-primary outline-none transition-colors hover:border-border-emphasis focus:border-border-emphasis"
      >
        <span className="truncate">{selected?.label ?? "Select"}</span>
        <ChevronDown className={`ml-1 h-3.5 w-3.5 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && ReactDOM.createPortal(
        <ul
          ref={menuRef}
          className="fixed z-[100] max-h-48 overflow-y-auto rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
          style={{ top: pos.top, left: pos.left, width: pos.width }}
        >
          {options.map((p) => (
            <li
              key={p.key}
              role="option"
              aria-selected={p.key === value}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(p.key);
                setIsOpen(false);
              }}
              className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                p.key === value
                  ? "bg-bg-elevated text-text-primary font-medium"
                  : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
              }`}
            >
              {p.label}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  );
}

export function AddMetricModal({
  open,
  companyId,
  existingMetricNames,
  onClose,
  onSubmitted,
}: AddMetricModalProps) {
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Form state
  const [metricName, setMetricName] = React.useState("");
  const [periodType, setPeriodType] = React.useState<PeriodType>("monthly");
  const [rows, setRows] = React.useState<PeriodRow[]>(() => [
    { id: makeRowId(), periodKey: "", value: "" },
  ]);

  // AI definition suggestion
  const { definition: aiDefinition, isLoading: aiLoading } = useAIMetricDefinition(metricName);
  const { customDefinitions, saveDefinition } = useMetricDefinitions();

  // Autocomplete state — only show after user starts typing or presses arrow key
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1);
  const listboxRef = React.useRef<HTMLUListElement>(null);
  const hasTypedRef = React.useRef(false);

  // Submit state
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>(
    {},
  );

  // Available periods for the selected type
  const allPeriods = React.useMemo(
    () => generatePeriods(periodType),
    [periodType],
  );

  // Set first period row when periods change
  React.useEffect(() => {
    if (allPeriods.length > 0) {
      setRows([{ id: makeRowId(), periodKey: allPeriods[0].key, value: "" }]);
    }
  }, [allPeriods]);

  // Merged + deduplicated autocomplete options
  const allMetricNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const key of Object.keys(METRIC_DEFINITIONS)) set.add(key);
    for (const name of existingMetricNames) set.add(name);
    return Array.from(set).sort((a, b) =>
      a.toLowerCase().localeCompare(b.toLowerCase()),
    );
  }, [existingMetricNames]);

  const filteredSuggestions = React.useMemo(() => {
    if (!metricName.trim()) return allMetricNames.slice(0, 8);
    const lower = metricName.toLowerCase();
    return allMetricNames
      .filter((n) => n.toLowerCase().includes(lower))
      .slice(0, 8);
  }, [metricName, allMetricNames]);

  // Is this a currency metric?
  const isCurrency =
    metricName.trim() !== "" &&
    inferMetricValueType(metricName) === "currency";

  // Does this metric already exist?
  const alreadyExists = existingMetricNames.some(
    (n) => n.toLowerCase() === metricName.trim().toLowerCase(),
  );

  // Already-selected period keys (for filtering other rows' dropdowns)
  const selectedKeys = React.useMemo(
    () => new Set(rows.map((r) => r.periodKey).filter(Boolean)),
    [rows],
  );

  // Reset form state
  function resetForm() {
    setMetricName("");
    setPeriodType("monthly");
    setRows([{ id: makeRowId(), periodKey: "", value: "" }]);
    setError(null);
    setFieldErrors({});
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    hasTypedRef.current = false;
  }

  // Focus input when modal opens (without triggering dropdown)
  React.useEffect(() => {
    if (open) {
      hasTypedRef.current = false;
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    } else {
      resetForm();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Escape to close
  React.useEffect(() => {
    if (!open) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (showSuggestions) {
          setShowSuggestions(false);
        } else {
          onClose();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, showSuggestions]);

  // Focus trap
  React.useEffect(() => {
    if (!open) return;
    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

  function selectSuggestion(name: string) {
    setMetricName(name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }

  function handleInputKeyDown(e: React.KeyboardEvent) {
    if (!showSuggestions) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setShowSuggestions(true);
        setHighlightedIndex(0);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1,
        );
        break;
      case "Enter":
        e.preventDefault();
        if (
          highlightedIndex >= 0 &&
          highlightedIndex < filteredSuggestions.length
        ) {
          selectSuggestion(filteredSuggestions[highlightedIndex]);
        } else {
          setShowSuggestions(false);
        }
        break;
      case "Escape":
        e.preventDefault();
        setShowSuggestions(false);
        break;
    }
  }

  // Scroll highlighted item into view
  React.useEffect(() => {
    if (highlightedIndex >= 0 && listboxRef.current) {
      const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
      item?.scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  function updateRow(id: string, field: "periodKey" | "value", val: string) {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: val } : r)),
    );
    if (field === "value") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((r) => r.id !== id));
  }

  function addRow() {
    const nextPeriod = allPeriods.find((p) => !selectedKeys.has(p.key));
    setRows((prev) => [
      ...prev,
      { id: makeRowId(), periodKey: nextPeriod?.key ?? "", value: "" },
    ]);
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    let valid = true;

    if (!metricName.trim()) {
      setError("Metric name is required.");
      valid = false;
    }

    const hasAnyValue = rows.some((r) => r.value.trim());
    if (!hasAnyValue) {
      if (valid) setError("Enter a value for at least one period.");
      valid = false;
    }

    for (const row of rows) {
      const cleaned = row.value.replace(/[$,\s]/g, "").trim();
      if (cleaned && isNaN(Number(cleaned))) {
        errors[row.id] = "Must be a number";
        valid = false;
      }
    }

    setFieldErrors(errors);
    if (valid) setError(null);
    return valid;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setError(null);

    const submissions: Array<{
      metricName: string;
      periodType: string;
      periodStart: string;
      periodEnd: string;
      value: string;
      source: string;
    }> = [];

    for (const row of rows) {
      const cleaned = row.value.replace(/[$,\s]/g, "").trim();
      if (!cleaned) continue;

      const period = allPeriods.find((p) => p.key === row.periodKey);
      if (!period) continue;

      submissions.push({
        metricName: metricName.trim(),
        periodType,
        periodStart: period.start,
        periodEnd: period.end,
        value: cleaned,
        source: "manual",
      });
    }

    if (submissions.length === 0) {
      setError("No valid values to submit.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/metrics/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, submissions }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Submission failed.");
      }
      // Auto-save AI-generated definition if no system/custom definition exists
      const { info: existingDef } = resolveMetricDefinition(metricName.trim(), customDefinitions);
      if (aiDefinition && !existingDef) {
        saveDefinition(metricName.trim(), {
          description: aiDefinition.description,
          formula: aiDefinition.formula,
        }).catch(() => {
          // Non-critical — silently fail
        });
      }
      onSubmitted();
      onClose();
      toast.success("Metric submitted successfully.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Something went wrong.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  const metricDef = metricName.trim()
    ? resolveMetricDefinition(metricName, customDefinitions).info
    : null;
  const hasAvailablePeriods = allPeriods.some((p) => !selectedKeys.has(p.key));

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-backdrop backdrop-blur-sm modal-backdrop-enter">
      {/* Backdrop click to close */}
      <div
        className="absolute inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative mx-4 flex max-h-[min(90vh,680px)] w-full max-w-lg flex-col rounded-xl border border-border-default bg-bg-secondary shadow-2xl modal-dialog-enter"
      >
        {/* Header — pinned */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-4">
          <h3
            id={titleId}
            className="text-lg font-semibold text-text-primary"
          >
            Add Metric
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1.5 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-hidden"
        >
          <div data-scroll-body className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
            {/* Metric name autocomplete */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Metric Name
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={showSuggestions && filteredSuggestions.length > 0}
                  aria-controls="metric-suggestions"
                  aria-activedescendant={
                    highlightedIndex >= 0
                      ? `suggestion-${highlightedIndex}`
                      : undefined
                  }
                  value={metricName}
                  onChange={(e) => {
                    setMetricName(e.target.value);
                    hasTypedRef.current = true;
                    setShowSuggestions(true);
                    setHighlightedIndex(-1);
                  }}
                  onFocus={() => {
                    // Only open suggestions if user has already typed something
                    if (hasTypedRef.current || metricName.trim()) {
                      setShowSuggestions(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 150);
                  }}
                  onKeyDown={handleInputKeyDown}
                  placeholder="e.g. Revenue, Burn Rate, or custom name"
                  className="h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary placeholder:text-text-faint outline-none focus:border-border-default"
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <ul
                    ref={listboxRef}
                    id="metric-suggestions"
                    role="listbox"
                    className="absolute left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto overflow-x-hidden rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
                  >
                    {filteredSuggestions.map((name, i) => {
                      const def = getMetricDefinition(name);
                      return (
                        <li
                          key={name}
                          id={`suggestion-${i}`}
                          role="option"
                          aria-selected={i === highlightedIndex}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            selectSuggestion(name);
                          }}
                          onMouseEnter={() => setHighlightedIndex(i)}
                          className={`cursor-pointer px-3 py-2 text-sm transition-colors ${
                            i === highlightedIndex
                              ? "bg-bg-elevated text-text-primary"
                              : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                          }`}
                        >
                          <span className="font-medium">{name}</span>
                          {def && (
                            <p className="mt-0.5 text-xs text-text-muted line-clamp-1">
                              {def.description}
                            </p>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
              {!showSuggestions && (
                metricDef ? (
                  <p className="mt-1.5 text-xs text-text-muted line-clamp-1">
                    {metricDef.description}
                  </p>
                ) : aiLoading ? (
                  <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-bg-elevated" />
                ) : aiDefinition ? (
                  <p className="mt-1.5 text-xs text-text-muted line-clamp-2">
                    {aiDefinition.description}
                    <span className="ml-1 text-text-faint">(AI-suggested)</span>
                  </p>
                ) : null
              )}
            </div>

            {/* Period type selector */}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-text-secondary">
                Period Type
              </label>
              <SlidingTabs
                tabs={periodTypeTabs}
                value={periodType}
                onChange={setPeriodType}
                variant="pill"
                size="sm"
                showIcons={false}
              />
            </div>

            {/* Period rows */}
            <div>
              <label className="mb-2 block text-sm font-medium text-text-secondary">
                Periods &amp; Values
              </label>
              <div className="rounded-lg border border-border-subtle bg-bg-elevated/50 p-3">
                <div className="space-y-2.5">
                  {rows.map((row) => {
                    const availablePeriods = allPeriods.filter(
                      (p) =>
                        p.key === row.periodKey || !selectedKeys.has(p.key),
                    );
                    return (
                      <div key={row.id} className="flex items-start gap-2">
                        <PeriodDropdown
                          value={row.periodKey}
                          options={availablePeriods}
                          onChange={(key) => updateRow(row.id, "periodKey", key)}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="relative">
                            {isCurrency && (
                              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-text-muted">
                                $
                              </span>
                            )}
                            <input
                              type="text"
                              inputMode="decimal"
                              value={row.value}
                              onChange={(e) =>
                                updateRow(row.id, "value", e.target.value)
                              }
                              placeholder="Enter value"
                              className={`h-10 w-full rounded-md border bg-bg-input pr-3 text-sm text-text-primary placeholder:text-text-faint outline-none ${
                                isCurrency ? "pl-7" : "pl-3"
                              } ${
                                fieldErrors[row.id]
                                  ? "border-[var(--error-border)] focus:border-[var(--error-accent)]"
                                  : "border-border-default focus:border-border-default"
                              }`}
                            />
                          </div>
                          {fieldErrors[row.id] && (
                            <p className="mt-1 text-xs text-[var(--error-accent)]">
                              {fieldErrors[row.id]}
                            </p>
                          )}
                        </div>
                        {rows.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="mt-1.5 shrink-0 rounded-md p-1.5 text-text-faint transition-colors hover:bg-bg-hover hover:text-text-secondary"
                            aria-label="Remove period"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
                {hasAvailablePeriods && (
                  <button
                    type="button"
                    onClick={addRow}
                    className="mt-2.5 flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-text-muted transition-colors hover:bg-bg-hover hover:text-text-secondary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add another period
                  </button>
                )}
              </div>
            </div>

            {/* "Already exists" info */}
            {alreadyExists && (
              <div className="flex items-start gap-2.5 rounded-lg bg-[var(--tag-blue-bg)] px-3.5 py-3 text-sm text-[var(--tag-blue-text)]">
                <Info
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                />
                <span>
                  This metric already has data. New periods will be added and
                  existing periods will be updated.
                </span>
              </div>
            )}

          </div>

          {/* Footer — pinned */}
          <div className="flex items-center justify-end gap-3 border-t border-border-subtle px-6 py-4">
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body,
  );
}

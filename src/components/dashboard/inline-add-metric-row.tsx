"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { Check, X, Plus, Search, AlertTriangle } from "lucide-react";
import { METRIC_DEFINITIONS } from "@/lib/metric-definitions";
import { checkMetricConflicts, type MetricConflict } from "@/lib/utils/metric-similarity";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Props = {
  /** Period start dates for each column */
  displayPeriods: string[];
  /** Metric names already tracked for this company */
  existingMetricNames: string[];
  /** Whether to show the totals column (determines extra td) */
  showTotals: boolean;
  /** Whether reorder grip column is visible */
  isReorderMode: boolean;
  /** Column width for period columns */
  periodColWidth: number | null;
  /** Metric name column width */
  metricColWidth: number;
  /** Grip column width */
  gripColWidth: number;
  /** Total column width */
  totalColWidth: number;
  /** Called when user saves the inline metric */
  onSave: (
    metricName: string,
    values: { periodStart: string; value: string }[],
  ) => Promise<boolean>;
  /** Called when user cancels */
  onCancel: () => void;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const METRIC_NAMES = Object.keys(METRIC_DEFINITIONS);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
  if (!val.trim()) return true;
  return /^-?\d+(\.\d+)?$/.test(val.trim());
}

// ---------------------------------------------------------------------------
// MetricCombobox — searchable dropdown with similarity annotations
// ---------------------------------------------------------------------------

type ComboboxItem = {
  name: string;
  isTracked: boolean;
  conflict: MetricConflict | null;
};

function MetricCombobox({
  existingNames,
  onSelect,
  onCancel,
  dropdownContainerRef,
}: {
  existingNames: string[];
  onSelect: (name: string) => void;
  onCancel: () => void;
  dropdownContainerRef: React.RefObject<HTMLElement | null>;
}) {
  const [query, setQuery] = React.useState("");
  const [showDropdown, setShowDropdown] = React.useState(false);
  const [highlightIndex, setHighlightIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const existingLower = React.useMemo(
    () => new Set(existingNames.map((n) => n.toLowerCase())),
    [existingNames],
  );

  const items = React.useMemo(() => {
    const lower = query.toLowerCase().trim();
    let candidates: string[];
    if (!lower) {
      candidates = METRIC_NAMES.slice(0, 30);
    } else {
      candidates = METRIC_NAMES.filter((n) =>
        n.toLowerCase().includes(lower),
      ).slice(0, 20);
    }

    const result: ComboboxItem[] = candidates.map((name) => {
      const isTracked = existingLower.has(name.toLowerCase());
      const conflicts = isTracked ? [] : checkMetricConflicts(name, existingNames);
      return {
        name,
        isTracked,
        conflict: conflicts[0] ?? null,
      };
    });

    return result;
  }, [query, existingNames, existingLower]);

  const hasExactPredefined = items.some(
    (it) => it.name.toLowerCase() === query.toLowerCase().trim(),
  );
  const showCustomOption =
    query.trim().length > 0 &&
    !hasExactPredefined &&
    !existingLower.has(query.trim().toLowerCase());

  // Selectable items (not tracked)
  const selectableItems = React.useMemo(() => {
    const selectable = items.filter((it) => !it.isTracked);
    if (showCustomOption) {
      selectable.push({
        name: `__custom__${query.trim()}`,
        isTracked: false,
        conflict: null,
      });
    }
    return selectable;
  }, [items, showCustomOption, query]);

  // Reset highlight when items change
  React.useEffect(() => {
    setHighlightIndex(0);
  }, [query]);

  // Auto-focus input
  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Close dropdown on outside click
  React.useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleSelectItem(item: ComboboxItem) {
    if (item.isTracked) return;
    const name = item.name.startsWith("__custom__")
      ? item.name.replace("__custom__", "")
      : item.name;
    onSelect(name);
  }

  // Compute dropdown position for portal
  const [dropdownPos, setDropdownPos] = React.useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  React.useEffect(() => {
    if (!showDropdown || !inputRef.current) {
      setDropdownPos(null);
      return;
    }
    const rect = inputRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 320),
    });
  }, [showDropdown, query]);

  return (
    <div ref={containerRef} className="relative flex items-center gap-1">
      <Search
        className="pointer-events-none h-3.5 w-3.5 shrink-0 text-text-faint"
        aria-hidden="true"
      />
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
          if (e.key === "Escape") {
            e.preventDefault();
            if (showDropdown) {
              setShowDropdown(false);
            } else {
              onCancel();
            }
          } else if (e.key === "ArrowDown") {
            e.preventDefault();
            setHighlightIndex((prev) =>
              Math.min(prev + 1, selectableItems.length - 1),
            );
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlightIndex((prev) => Math.max(prev - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (selectableItems.length > 0 && highlightIndex < selectableItems.length) {
              handleSelectItem(selectableItems[highlightIndex]);
            } else if (showCustomOption && query.trim()) {
              onSelect(query.trim());
            }
          }
        }}
        placeholder="Search metrics..."
        className="h-8 w-full min-w-0 rounded-md border border-border-default bg-bg-input px-2 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
      />

      {/* Dropdown via portal */}
      {showDropdown &&
        dropdownPos &&
        (items.length > 0 || showCustomOption) &&
        dropdownContainerRef.current &&
        createPortal(
          <div
            className="fixed z-[var(--z-popover)] max-h-[280px] overflow-y-auto rounded-lg border border-border-default bg-bg-secondary py-1 shadow-xl backdrop-blur-sm"
            style={{
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
            }}
            onMouseDown={(e) => e.preventDefault()} // prevent blur
          >
            {items.map((item, idx) => {
              const selectableIdx = selectableItems.indexOf(item);
              const isHighlighted =
                !item.isTracked && selectableIdx === highlightIndex;

              return (
                <button
                  key={item.name}
                  type="button"
                  disabled={item.isTracked}
                  onClick={() => handleSelectItem(item)}
                  onMouseEnter={() => {
                    if (!item.isTracked && selectableIdx >= 0) {
                      setHighlightIndex(selectableIdx);
                    }
                  }}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    item.isTracked
                      ? "cursor-default text-text-faint"
                      : isHighlighted
                        ? "bg-bg-elevated text-text-primary"
                        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                  }`}
                >
                  <span className="truncate">{item.name}</span>
                  {item.isTracked && (
                    <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] font-medium text-text-faint">
                      Already tracked
                    </span>
                  )}
                  {!item.isTracked && item.conflict?.type === "synonym" && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded bg-[var(--status-warning-bg)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--status-warning-text)]">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      Similar to &ldquo;{item.conflict.matchedName}&rdquo;
                    </span>
                  )}
                  {!item.isTracked &&
                    item.conflict?.type === "fuzzy" && (
                      <span className="shrink-0 rounded bg-bg-elevated px-1.5 py-0.5 text-[10px] text-text-muted">
                        Looks similar to &ldquo;{item.conflict.matchedName}&rdquo;
                      </span>
                    )}
                </button>
              );
            })}
            {showCustomOption && (
              <button
                type="button"
                onClick={() => onSelect(query.trim())}
                onMouseEnter={() =>
                  setHighlightIndex(selectableItems.length - 1)
                }
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
                  highlightIndex === selectableItems.length - 1
                    ? "bg-bg-elevated text-text-primary"
                    : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary"
                }`}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add custom: &ldquo;{query.trim()}&rdquo;
              </button>
            )}
          </div>,
          document.body,
        )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// InlineAddMetricRow
// ---------------------------------------------------------------------------

export function InlineAddMetricRow({
  displayPeriods,
  existingMetricNames,
  showTotals,
  isReorderMode,
  periodColWidth,
  metricColWidth,
  gripColWidth,
  totalColWidth,
  onSave,
  onCancel,
}: Props) {
  const [selectedMetric, setSelectedMetric] = React.useState<string | null>(
    null,
  );
  const [cellValues, setCellValues] = React.useState<Record<string, string>>(
    {},
  );
  const [saving, setSaving] = React.useState(false);
  const cellRefs = React.useRef<Map<string, HTMLInputElement>>(new Map());
  const dropdownContainerRef = React.useRef<HTMLTableRowElement>(null);

  // Check for similarity conflicts on the selected metric
  const selectedConflicts = React.useMemo(() => {
    if (!selectedMetric) return [];
    return checkMetricConflicts(selectedMetric, existingMetricNames);
  }, [selectedMetric, existingMetricNames]);

  const synonymWarning = selectedConflicts.find(
    (c) => c.type === "synonym" || c.type === "fuzzy",
  );

  // Focus first period cell when metric is selected
  React.useEffect(() => {
    if (selectedMetric && displayPeriods.length > 0) {
      // Focus the last period cell (most recent) after a short delay for DOM render
      const timeout = setTimeout(() => {
        const lastPeriod = displayPeriods[displayPeriods.length - 1];
        cellRefs.current.get(lastPeriod)?.focus();
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [selectedMetric, displayPeriods]);

  function handleCellChange(periodStart: string, value: string) {
    setCellValues((prev) => ({ ...prev, [periodStart]: value }));
  }

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    periodIndex: number,
  ) {
    if (e.key === "Tab" && !e.shiftKey && periodIndex === displayPeriods.length - 1) {
      // Last cell, tab out — don't prevent default
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.metaKey || e.ctrlKey || periodIndex === displayPeriods.length - 1) {
        handleSave();
      } else {
        // Focus next cell
        const nextPeriod = displayPeriods[periodIndex + 1];
        if (nextPeriod) cellRefs.current.get(nextPeriod)?.focus();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    } else if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      const nextPeriod = displayPeriods[periodIndex + 1];
      if (nextPeriod) cellRefs.current.get(nextPeriod)?.focus();
    } else if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      const prevPeriod = displayPeriods[periodIndex - 1];
      if (prevPeriod) cellRefs.current.get(prevPeriod)?.focus();
    }
  }

  async function handleSave() {
    if (!selectedMetric) return;

    // Collect non-empty values
    const values: { periodStart: string; value: string }[] = [];
    for (const period of displayPeriods) {
      const val = cellValues[period]?.trim();
      if (val) {
        if (!isValidNumericValue(val)) return; // Don't save if invalid
        values.push({ periodStart: period, value: val });
      }
    }

    if (values.length === 0) return;

    setSaving(true);
    const success = await onSave(selectedMetric, values);
    setSaving(false);

    if (!success) {
      // Stay in editing mode on failure
    }
    // On success, the parent will unmount this component via state change
  }

  const hasValues = Object.values(cellValues).some((v) => v.trim() !== "");
  const hasInvalid = Object.values(cellValues).some(
    (v) => v.trim() !== "" && !isValidNumericValue(v),
  );

  return (
    <>
      <tr
        className="border-b border-border-subtle bg-[var(--tag-blue-bg)]/30"
        ref={dropdownContainerRef}
      >
        {/* Grip column spacer */}
        {isReorderMode && (
          <td
            className="sticky left-0 z-10 bg-[var(--tag-blue-bg)]/30 py-2 pl-2"
            style={{ width: gripColWidth }}
          />
        )}

        {/* Metric name combobox cell (sticky left) */}
        <td
          className={`sticky ${isReorderMode ? "left-8" : "left-0"} z-10 bg-[var(--tag-blue-bg)]/30 py-2 pl-3 pr-2`}
          style={{
            boxShadow: "4px 0 6px -4px var(--table-sticky-shadow)",
            width: metricColWidth,
          }}
        >
          {!selectedMetric ? (
            <MetricCombobox
              existingNames={existingMetricNames}
              onSelect={setSelectedMetric}
              onCancel={onCancel}
              dropdownContainerRef={dropdownContainerRef}
            />
          ) : (
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => {
                  setSelectedMetric(null);
                  setCellValues({});
                }}
                className="truncate text-left text-sm font-medium text-text-primary hover:text-[var(--tag-blue-text)]"
                title="Click to change metric"
              >
                {selectedMetric}
              </button>
              {synonymWarning && (
                <span className="inline-flex items-center gap-1 text-[10px] text-[var(--status-warning-text)]">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Similar to &ldquo;{synonymWarning.matchedName}&rdquo;
                </span>
              )}
            </div>
          )}
        </td>

        {/* Period value cells */}
        {displayPeriods.map((period, idx) => {
          const val = cellValues[period] ?? "";
          const isInvalid = val.trim() !== "" && !isValidNumericValue(val);
          return (
            <td
              key={period}
              className="py-2 px-1"
              style={{ width: periodColWidth ?? 150 }}
            >
              <input
                ref={(el) => {
                  if (el) cellRefs.current.set(period, el);
                  else cellRefs.current.delete(period);
                }}
                type="text"
                inputMode="decimal"
                value={val}
                onChange={(e) => handleCellChange(period, e.target.value)}
                onKeyDown={(e) => handleCellKeyDown(e, idx)}
                disabled={!selectedMetric || saving}
                placeholder={
                  selectedMetric ? getFormatHint(selectedMetric) : ""
                }
                className={`h-8 w-full rounded-md border bg-bg-input px-2 text-right text-sm tabular-nums outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)] focus:ring-1 focus:ring-[var(--ring-focus)] disabled:opacity-60 ${
                  isInvalid
                    ? "border-[var(--error-border)] text-[var(--error-accent)]"
                    : "border-border-default text-text-primary"
                }`}
              />
            </td>
          );
        })}

        {/* Totals / action cell (sticky right) */}
        {showTotals && (
          <td
            className="sticky right-0 z-10 bg-[var(--tag-blue-bg)]/30 px-2 py-2"
            style={{
              boxShadow: "-4px 0 6px -4px var(--table-sticky-shadow)",
              width: totalColWidth,
            }}
          >
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedMetric || !hasValues || hasInvalid || saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--status-success-text)] transition-colors hover:bg-[var(--status-success-bg)] disabled:opacity-40 disabled:hover:bg-transparent"
                title="Save (Cmd+Enter)"
                aria-label="Save metric"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary disabled:opacity-40"
                title="Cancel (Esc)"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </td>
        )}

        {/* If no totals column, put actions in an extra cell */}
        {!showTotals && (
          <td className="px-2 py-2">
            <div className="flex items-center justify-end gap-1">
              <button
                type="button"
                onClick={handleSave}
                disabled={!selectedMetric || !hasValues || hasInvalid || saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--status-success-text)] transition-colors hover:bg-[var(--status-success-bg)] disabled:opacity-40 disabled:hover:bg-transparent"
                title="Save (Cmd+Enter)"
                aria-label="Save metric"
              >
                {saving ? (
                  <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={saving}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-bg-elevated hover:text-text-secondary disabled:opacity-40"
                title="Cancel (Esc)"
                aria-label="Cancel"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </td>
        )}
      </tr>
    </>
  );
}

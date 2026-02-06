"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ChevronDown, Check, X, BarChart3, Table2, Loader2 } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { formatPeriod } from "@/components/charts/types";
import { SlidingIconTabs } from "@/components/ui/sliding-tabs";
import { NormalizationToggle, type NormalizationMode } from "./normalization-toggle";
import { ComparisonChart } from "./comparison-chart";
import { ComparisonTable } from "./comparison-table";

type CompanyOption = {
  id: string;
  name: string;
};

type ComparisonClientProps = {
  companies: CompanyOption[];
  availableMetrics: string[];
};

type PeriodType = "monthly" | "quarterly" | "yearly";

type CompanyMetricData = {
  id: string;
  name: string;
  metrics: Record<
    string,
    Array<{ period_start: string; period_end: string; value: number }>
  >;
};

type ViewMode = "chart" | "table";

const PERIOD_OPTIONS: { value: PeriodType; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Annual" },
];

// --- Multi-select dropdown component ---
function MultiSelectDropdown({
  label,
  options,
  selected,
  onChange,
  maxSelections,
  minSelections,
  renderOption,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (selected: string[]) => void;
  maxSelections?: number;
  minSelections?: number;
  renderOption?: (option: { value: string; label: string }, isSelected: boolean) => React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setIsOpen(false);
    }
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      if (minSelections && selected.length <= minSelections) return;
      onChange(selected.filter((s) => s !== value));
    } else {
      if (maxSelections && selected.length >= maxSelections) return;
      onChange([...selected, value]);
    }
  };

  const removeOption = (value: string) => {
    if (minSelections && selected.length <= minSelections) return;
    onChange(selected.filter((s) => s !== value));
  };

  const selectedLabels = selected
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .slice(0, 3);
  const overflowCount = selected.length - selectedLabels.length;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex min-h-[2.75rem] w-full items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
          isOpen
            ? "border-white/20 bg-black/40"
            : "border-white/10 bg-black/30 hover:border-white/15"
        )}
      >
        <div className="flex flex-1 flex-wrap items-center gap-1.5">
          {selected.length === 0 ? (
            <span className="text-white/40">{label}</span>
          ) : (
            <>
              {selectedLabels.map((name) => {
                const value = selected[selectedLabels.indexOf(name)];
                return (
                  <span
                    key={value}
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-xs text-white/80"
                  >
                    {name}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeOption(value);
                      }}
                      className="text-white/40 hover:text-white/70"
                      aria-label={`Remove ${name}`}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                );
              })}
              {overflowCount > 0 && (
                <span className="text-xs text-white/50">+{overflowCount} more</span>
              )}
            </>
          )}
        </div>
        <ChevronDown
          className={cn(
            "h-4 w-4 flex-shrink-0 text-white/40 transition-transform duration-150",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-white/10 bg-zinc-900 py-1 shadow-xl">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-white/40">No options available</div>
          ) : (
            options.map((option) => {
              const isSelected = selected.includes(option.value);
              const isDisabled =
                !isSelected && maxSelections !== undefined && selected.length >= maxSelections;

              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !isDisabled && toggleOption(option.value)}
                  disabled={isDisabled}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                    isSelected
                      ? "bg-white/[0.06] text-white"
                      : isDisabled
                        ? "cursor-not-allowed text-white/20"
                        : "text-white/70 hover:bg-white/[0.04] hover:text-white"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border transition-colors",
                      isSelected
                        ? "border-white/30 bg-white/15"
                        : "border-white/15 bg-transparent"
                    )}
                  >
                    {isSelected && <Check className="h-3 w-3 text-white" />}
                  </span>
                  {renderOption ? (
                    renderOption(option, isSelected)
                  ) : (
                    <span className="truncate">{option.label}</span>
                  )}
                </button>
              );
            })
          )}
          {maxSelections && (
            <div className="border-t border-white/[0.06] px-3 py-1.5 text-[10px] text-white/30">
              {selected.length}/{maxSelections} selected
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// --- Normalization functions ---
function applyNormalization(
  companiesData: CompanyMetricData[],
  metricName: string,
  normalization: NormalizationMode,
  periodType: PeriodType
): Array<Record<string, string | number | null>> {
  // Collect all unique periods across all companies for this metric
  const periodsSet = new Set<string>();
  for (const company of companiesData) {
    const metricData = company.metrics[metricName];
    if (metricData) {
      for (const point of metricData) {
        periodsSet.add(point.period_start);
      }
    }
  }

  const periods = Array.from(periodsSet).sort(
    (a, b) => new Date(a).getTime() - new Date(b).getTime()
  );

  if (periods.length === 0) return [];

  // Build raw data indexed by period and company
  const rawByPeriodAndCompany = new Map<string, Map<string, number>>();
  for (const period of periods) {
    rawByPeriodAndCompany.set(period, new Map());
  }
  for (const company of companiesData) {
    const metricData = company.metrics[metricName];
    if (metricData) {
      for (const point of metricData) {
        rawByPeriodAndCompany.get(point.period_start)?.set(company.name, point.value);
      }
    }
  }

  // Compute base values (first non-null value per company) for indexed mode
  const baseValues = new Map<string, number>();
  if (normalization === "indexed") {
    for (const company of companiesData) {
      for (const period of periods) {
        const val = rawByPeriodAndCompany.get(period)?.get(company.name);
        if (val !== undefined && val !== 0) {
          baseValues.set(company.name, val);
          break;
        }
      }
    }
  }

  // Build output rows
  const result: Array<Record<string, string | number | null>> = [];

  for (let i = 0; i < periods.length; i++) {
    const period = periods[i];
    const periodLabel = formatPeriod(period, periodType);
    const row: Record<string, string | number | null> = {
      period: periodLabel,
      periodStart: period,
    };

    for (const company of companiesData) {
      const currentVal = rawByPeriodAndCompany.get(period)?.get(company.name);

      if (currentVal === undefined) {
        row[company.name] = null;
        continue;
      }

      switch (normalization) {
        case "absolute":
          row[company.name] = currentVal;
          break;

        case "indexed": {
          const base = baseValues.get(company.name);
          if (base === undefined || base === 0) {
            row[company.name] = null;
          } else {
            row[company.name] = Math.round(((currentVal / base) * 100) * 10) / 10;
          }
          break;
        }

        case "percent_change": {
          if (i === 0) {
            row[company.name] = null;
            continue;
          }
          const prevPeriod = periods[i - 1];
          const prevVal = rawByPeriodAndCompany.get(prevPeriod)?.get(company.name);
          if (prevVal === undefined || prevVal === 0) {
            row[company.name] = null;
          } else {
            row[company.name] =
              Math.round((((currentVal - prevVal) / Math.abs(prevVal)) * 100) * 10) / 10;
          }
          break;
        }
      }
    }

    // For percent_change, skip the first row since it has no previous period
    if (normalization === "percent_change" && i === 0) continue;

    result.push(row);
  }

  return result;
}

// --- Main client component ---
export function ComparisonClient({
  companies,
  availableMetrics,
}: ComparisonClientProps) {
  const [selectedCompanies, setSelectedCompanies] = useState<string[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([]);
  const [periodType, setPeriodType] = useState<PeriodType>("quarterly");
  const [normalization, setNormalization] = useState<NormalizationMode>("absolute");
  const [viewMode, setViewMode] = useState<ViewMode>("chart");

  const [companiesData, setCompaniesData] = useState<CompanyMetricData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Abort controller ref for cancelling in-flight requests
  const abortRef = useRef<AbortController | null>(null);

  const companyOptions = useMemo(
    () => companies.map((c) => ({ value: c.id, label: c.name })),
    [companies]
  );

  const metricOptions = useMemo(
    () => availableMetrics.map((m) => ({ value: m, label: m })),
    [availableMetrics]
  );

  const canFetch = selectedCompanies.length >= 2 && selectedMetrics.length >= 1;

  const fetchComparison = useCallback(async () => {
    if (!canFetch) return;

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        companyIds: selectedCompanies.join(","),
        metrics: selectedMetrics.join(","),
        periodType,
      });

      const res = await fetch(`/api/investors/portfolio/compare?${params}`, {
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed (${res.status})`);
      }

      const data = await res.json();
      setCompaniesData(data.companies ?? []);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to load comparison data.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [canFetch, selectedCompanies, selectedMetrics, periodType]);

  // Fetch data when selections change
  useEffect(() => {
    if (canFetch) {
      fetchComparison();
    } else {
      setCompaniesData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCompanies, selectedMetrics, periodType]);

  // Cleanup abort on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  // Compute chart/table data per metric
  const chartDataByMetric = useMemo(() => {
    if (companiesData.length === 0) return {};

    const result: Record<string, Array<Record<string, string | number | null>>> = {};
    for (const metric of selectedMetrics) {
      result[metric] = applyNormalization(companiesData, metric, normalization, periodType);
    }
    return result;
  }, [companiesData, selectedMetrics, normalization, periodType]);

  const companyNames = useMemo(
    () => companiesData.map((c) => c.name),
    [companiesData]
  );

  const hasResults = companiesData.length > 0 && selectedMetrics.length > 0;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Company selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Companies (2-8)
            </label>
            <MultiSelectDropdown
              label="Select companies..."
              options={companyOptions}
              selected={selectedCompanies}
              onChange={setSelectedCompanies}
              maxSelections={8}
            />
          </div>

          {/* Metric selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Metrics
            </label>
            <MultiSelectDropdown
              label="Select metrics..."
              options={metricOptions}
              selected={selectedMetrics}
              onChange={setSelectedMetrics}
            />
          </div>

          {/* Period type selector */}
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/40">
              Period
            </label>
            <select
              value={periodType}
              onChange={(e) => setPeriodType(e.target.value as PeriodType)}
              className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* View + Normalization controls */}
          <div className="flex flex-col justify-end gap-2">
            <div className="flex items-center gap-3">
              <SlidingIconTabs
                tabs={[
                  { value: "chart" as ViewMode, icon: BarChart3, label: "Chart view" },
                  { value: "table" as ViewMode, icon: Table2, label: "Table view" },
                ]}
                value={viewMode}
                onChange={setViewMode}
              />
              <NormalizationToggle
                value={normalization}
                onChange={setNormalization}
              />
            </div>
          </div>
        </div>

        {/* Validation messages */}
        {selectedCompanies.length > 0 && selectedCompanies.length < 2 && (
          <p className="mt-2 text-xs text-amber-300/80">
            Select at least 2 companies to compare.
          </p>
        )}
        {selectedCompanies.length >= 2 && selectedMetrics.length === 0 && (
          <p className="mt-2 text-xs text-amber-300/80">
            Select at least 1 metric to compare.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div
          className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-200"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-12 text-white/50">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Loading comparison data...</span>
        </div>
      )}

      {/* Results */}
      {!isLoading && hasResults && (
        <div className="space-y-6">
          {selectedMetrics.map((metric) => {
            const data = chartDataByMetric[metric] ?? [];

            if (viewMode === "chart") {
              return (
                <ComparisonChart
                  key={metric}
                  data={data}
                  companies={companyNames}
                  metricName={metric}
                  periodType={periodType}
                  normalization={normalization}
                />
              );
            }

            return (
              <div key={metric}>
                <h3 className="mb-2 text-sm font-medium text-white/80">{metric}</h3>
                <ComparisonTable
                  data={data}
                  companies={companyNames}
                  metricName={metric}
                  normalization={normalization}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && !hasResults && canFetch && companiesData.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-white/60">
            No metric data found for the selected companies and parameters.
          </p>
        </div>
      )}

      {/* Initial state */}
      {!canFetch && !isLoading && !error && (
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-12 text-center">
          <BarChart3 className="mx-auto mb-3 h-10 w-10 text-white/20" />
          <p className="text-white/50">
            Select at least 2 companies and 1 metric to start comparing.
          </p>
        </div>
      )}
    </div>
  );
}

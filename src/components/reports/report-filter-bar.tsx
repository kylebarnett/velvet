"use client";

import * as React from "react";
import { X } from "lucide-react";
import type { ReportType } from "@/lib/reports/templates";

const INDUSTRIES = [
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "edtech", label: "EdTech" },
  { value: "ai_ml", label: "AI/ML" },
  { value: "other", label: "Other" },
];

const STAGES = [
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth", label: "Growth" },
];

type TimeRange = "latest" | "last_quarter" | "last_year" | "all";

const TIME_RANGE_OPTIONS: Array<{ value: TimeRange; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "last_quarter", label: "Last Quarter" },
  { value: "last_year", label: "Last Year" },
  { value: "all", label: "All Time" },
];

type ReportFilterBarProps = {
  reportType: ReportType;
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
};

export function ReportFilterBar({
  reportType,
  filters,
  onFiltersChange,
}: ReportFilterBarProps) {
  if (reportType === "summary") {
    return (
      <SummaryFilters
        filters={filters}
        onFiltersChange={onFiltersChange}
      />
    );
  }

  // Comparison and Benchmarks filters are embedded in their client components
  // Deep Dive filters are embedded in its editor
  return null;
}

function SummaryFilters({
  filters,
  onFiltersChange,
}: {
  filters: Record<string, unknown>;
  onFiltersChange: (filters: Record<string, unknown>) => void;
}) {
  const industries = (filters.industries as string)?.split(",").filter(Boolean) ?? [];
  const stages = (filters.stages as string)?.split(",").filter(Boolean) ?? [];
  const timeRange = (filters.timeRange as TimeRange) ?? "latest";
  const hasFilters = industries.length > 0 || stages.length > 0;

  function updateFilter(key: string, value: string | null) {
    const next = { ...filters };
    if (value) {
      next[key] = value;
    } else {
      delete next[key];
    }
    onFiltersChange(next);
  }

  function toggleIndustry(value: string) {
    const updated = industries.includes(value)
      ? industries.filter((i) => i !== value)
      : [...industries, value];
    updateFilter("industries", updated.length > 0 ? updated.join(",") : null);
  }

  function toggleStage(value: string) {
    const updated = stages.includes(value)
      ? stages.filter((s) => s !== value)
      : [...stages, value];
    updateFilter("stages", updated.length > 0 ? updated.join(",") : null);
  }

  function setTimeRange(tr: TimeRange) {
    updateFilter("timeRange", tr === "latest" ? null : tr);
  }

  function clearFilters() {
    onFiltersChange({});
  }

  return (
    <div className="card-surface rounded-xl border border-border-subtle p-4 space-y-3">
      {/* Time range */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Time</span>
        <div className="flex items-center gap-1 rounded-lg border border-border-subtle bg-bg-elevated p-1">
          {TIME_RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTimeRange(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                timeRange === opt.value
                  ? "bg-bg-primary text-text-primary shadow-sm"
                  : "text-text-tertiary hover:text-text-secondary"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Industry chips */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Industry</span>
        <div className="flex flex-wrap gap-1.5">
          {INDUSTRIES.map((option) => {
            const isSelected = industries.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleIndustry(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] ring-1 ring-[var(--tag-blue-bg)]"
                    : "bg-bg-raised text-text-muted ring-1 ring-border-subtle hover:bg-bg-elevated hover:text-text-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stage chips */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-text-muted">Stage</span>
        <div className="flex flex-wrap gap-1.5">
          {STAGES.map((option) => {
            const isSelected = stages.includes(option.value);
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => toggleStage(option.value)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                  isSelected
                    ? "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] ring-1 ring-[var(--tag-emerald-bg)]"
                    : "bg-bg-raised text-text-muted ring-1 ring-border-subtle hover:bg-bg-elevated hover:text-text-secondary"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        {hasFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto flex items-center gap-1 text-xs text-text-muted transition-colors hover:text-text-primary"
          >
            <X className="h-3 w-3" />
            Clear filters
          </button>
        )}
      </div>
    </div>
  );
}

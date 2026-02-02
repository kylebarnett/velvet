"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type FilterOption = {
  value: string;
  label: string;
};

const INDUSTRIES: FilterOption[] = [
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "edtech", label: "EdTech" },
  { value: "ai_ml", label: "AI/ML" },
  { value: "other", label: "Other" },
];

const STAGES: FilterOption[] = [
  { value: "seed", label: "Seed" },
  { value: "series_a", label: "Series A" },
  { value: "series_b", label: "Series B" },
  { value: "series_c", label: "Series C" },
  { value: "growth", label: "Growth" },
];

export function ReportFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const updateFilters = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.push(`?${params.toString()}`);
    },
    [router, searchParams]
  );

  const industries = searchParams.get("industries")?.split(",").filter(Boolean) ?? [];
  const stages = searchParams.get("stages")?.split(",").filter(Boolean) ?? [];

  const toggleIndustry = (value: string) => {
    const updated = industries.includes(value)
      ? industries.filter((i) => i !== value)
      : [...industries, value];
    updateFilters("industries", updated.length > 0 ? updated.join(",") : null);
  };

  const toggleStage = (value: string) => {
    const updated = stages.includes(value)
      ? stages.filter((s) => s !== value)
      : [...stages, value];
    updateFilters("stages", updated.length > 0 ? updated.join(",") : null);
  };

  const clearFilters = () => {
    router.push("?");
  };

  const hasFilters = industries.length > 0 || stages.length > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-4">
        {/* Industry Filter */}
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">Industry</span>
          <div className="flex flex-wrap gap-1.5">
            {INDUSTRIES.map((option) => {
              const isSelected = industries.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleIndustry(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-500/20 to-blue-400/10 text-blue-300 ring-1 ring-blue-500/30"
                      : "bg-white/[0.03] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.06] hover:text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Stage Filter */}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span className="text-xs font-medium uppercase tracking-wider text-white/40">Stage</span>
          <div className="flex flex-wrap gap-1.5">
            {STAGES.map((option) => {
              const isSelected = stages.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleStage(option.value)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 text-emerald-300 ring-1 ring-emerald-500/30"
                      : "bg-white/[0.03] text-white/50 ring-1 ring-white/[0.06] hover:bg-white/[0.06] hover:text-white/70"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

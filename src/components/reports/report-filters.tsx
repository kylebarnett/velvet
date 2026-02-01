"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useState, useEffect } from "react";

type FilterOption = {
  value: string;
  label: string;
};

type Company = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
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

const PERIOD_TYPES: FilterOption[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

type ReportFiltersProps = {
  showPeriodType?: boolean;
  showDateRange?: boolean;
  showCompanySearch?: boolean;
};

export function ReportFilters({
  showPeriodType = true,
  showDateRange = true,
  showCompanySearch = true,
}: ReportFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [companySearch, setCompanySearch] = useState("");
  const [showCompanyDropdown, setShowCompanyDropdown] = useState(false);

  // Fetch companies for search
  useEffect(() => {
    if (showCompanySearch) {
      fetch("/api/investors/companies")
        .then((res) => res.json())
        .then((data) => {
          const approved = (data.companies ?? []).filter(
            (c: { approvalStatus: string }) =>
              ["auto_approved", "approved"].includes(c.approvalStatus)
          );
          setCompanies(approved);
        })
        .catch(() => {});
    }
  }, [showCompanySearch]);

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
  const selectedCompanyIds = searchParams.get("companyIds")?.split(",").filter(Boolean) ?? [];
  const periodType = searchParams.get("periodType") ?? "monthly";
  const startDate = searchParams.get("startDate") ?? "";
  const endDate = searchParams.get("endDate") ?? "";

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

  const toggleCompany = (companyId: string) => {
    const updated = selectedCompanyIds.includes(companyId)
      ? selectedCompanyIds.filter((id) => id !== companyId)
      : [...selectedCompanyIds, companyId];
    updateFilters("companyIds", updated.length > 0 ? updated.join(",") : null);
  };

  const clearFilters = () => {
    router.push("?");
  };

  const hasFilters =
    industries.length > 0 ||
    stages.length > 0 ||
    selectedCompanyIds.length > 0 ||
    startDate ||
    endDate ||
    (showPeriodType && periodType !== "monthly");

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectedCompanies = companies.filter((c) => selectedCompanyIds.includes(c.id));

  return (
    <div className="space-y-4">
      {/* Main filter bar */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.03] to-transparent">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-blue-500/[0.05] via-transparent to-transparent" />

        <div className="relative p-4">
          {/* Company Search */}
          {showCompanySearch && (
            <div className="mb-4">
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => {
                    setCompanySearch(e.target.value);
                    setShowCompanyDropdown(true);
                  }}
                  onFocus={() => setShowCompanyDropdown(true)}
                  placeholder="Search companies to filter..."
                  className="h-11 w-full rounded-xl border border-white/[0.08] bg-black/40 pl-10 pr-4 text-sm text-white placeholder:text-white/30 focus:border-white/20 focus:outline-none focus:ring-1 focus:ring-white/10"
                />
                {companySearch && (
                  <button
                    onClick={() => {
                      setCompanySearch("");
                      setShowCompanyDropdown(false);
                    }}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-white/40 hover:text-white/60"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}

                {/* Company dropdown */}
                {showCompanyDropdown && (companySearch || selectedCompanyIds.length === 0) && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-y-auto rounded-xl border border-white/[0.08] bg-zinc-900/95 p-1 shadow-2xl backdrop-blur-xl">
                    {filteredCompanies.length === 0 ? (
                      <div className="px-3 py-4 text-center text-sm text-white/40">
                        No companies found
                      </div>
                    ) : (
                      filteredCompanies.slice(0, 10).map((company) => {
                        const isSelected = selectedCompanyIds.includes(company.id);
                        return (
                          <button
                            key={company.id}
                            onClick={() => {
                              toggleCompany(company.id);
                              setCompanySearch("");
                              setShowCompanyDropdown(false);
                            }}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                              isSelected ? "bg-blue-500/10 text-white" : "text-white/70 hover:bg-white/[0.05]"
                            }`}
                          >
                            <div className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                              isSelected ? "border-blue-500 bg-blue-500" : "border-white/20"
                            }`}>
                              {isSelected && (
                                <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-sm font-medium">{company.name}</div>
                              {company.industry && (
                                <div className="text-xs text-white/40">
                                  {INDUSTRIES.find((i) => i.value === company.industry)?.label ?? company.industry}
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Selected companies */}
              {selectedCompanies.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedCompanies.map((company) => (
                    <span
                      key={company.id}
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/15 px-3 py-1.5 text-xs font-medium text-blue-300 ring-1 ring-blue-500/20"
                    >
                      {company.name}
                      <button
                        onClick={() => toggleCompany(company.id)}
                        className="text-blue-300/60 hover:text-blue-200"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

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
          </div>
        </div>

        {/* Bottom controls bar */}
        <div className="flex flex-wrap items-center gap-4 border-t border-white/[0.05] bg-white/[0.02] px-4 py-3">
          {/* Period Type */}
          {showPeriodType && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">Period</span>
              <div className="flex rounded-lg bg-black/30 p-0.5 ring-1 ring-white/[0.08]">
                {PERIOD_TYPES.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => updateFilters("periodType", option.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                      periodType === option.value
                        ? "bg-white/10 text-white shadow-sm"
                        : "text-white/50 hover:text-white/70"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Date Range */}
          {showDateRange && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">From</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateFilters("startDate", e.target.value || null)}
                className="h-8 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-xs text-white focus:border-white/20 focus:outline-none"
              />
              <span className="text-xs text-white/40">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateFilters("endDate", e.target.value || null)}
                className="h-8 rounded-lg border border-white/[0.08] bg-black/30 px-2.5 text-xs text-white focus:border-white/20 focus:outline-none"
              />
            </div>
          )}

          {/* Clear Filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1.5 text-xs text-white/50 transition-colors hover:text-white"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Click outside handler */}
      {showCompanyDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCompanyDropdown(false)}
        />
      )}
    </div>
  );
}

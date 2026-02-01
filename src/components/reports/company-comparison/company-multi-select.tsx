"use client";

import { useState, useEffect } from "react";

type Company = {
  id: string;
  name: string;
  industry: string | null;
  stage: string | null;
};

type CompanyMultiSelectProps = {
  companies: Company[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  maxSelection?: number;
  minSelection?: number;
};

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "Other",
};

export function CompanyMultiSelect({
  companies,
  selectedIds,
  onChange,
  maxSelection = 8,
  minSelection = 2,
}: CompanyMultiSelectProps) {
  const [search, setSearch] = useState("");

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const toggleCompany = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((i) => i !== id));
    } else if (selectedIds.length < maxSelection) {
      onChange([...selectedIds, id]);
    }
  };

  const selectAll = () => {
    const toSelect = filteredCompanies
      .slice(0, maxSelection)
      .map((c) => c.id);
    onChange(toSelect);
  };

  const clearAll = () => {
    onChange([]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-sm text-white/60">
          Select {minSelection}-{maxSelection} companies to compare
        </div>
        <div className="flex gap-2">
          <button
            onClick={selectAll}
            disabled={filteredCompanies.length === 0}
            className="text-xs text-white/60 underline underline-offset-4 hover:text-white disabled:opacity-50"
          >
            Select all
          </button>
          <button
            onClick={clearAll}
            disabled={selectedIds.length === 0}
            className="text-xs text-white/60 underline underline-offset-4 hover:text-white disabled:opacity-50"
          >
            Clear
          </button>
        </div>
      </div>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search companies..."
        className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm placeholder:text-white/40"
      />

      <div className="max-h-[300px] space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 p-2">
        {filteredCompanies.length === 0 ? (
          <div className="py-4 text-center text-sm text-white/40">
            No companies found
          </div>
        ) : (
          filteredCompanies.map((company) => {
            const isSelected = selectedIds.includes(company.id);
            const isDisabled = !isSelected && selectedIds.length >= maxSelection;

            return (
              <button
                key={company.id}
                onClick={() => toggleCompany(company.id)}
                disabled={isDisabled}
                className={`flex w-full items-center justify-between rounded-md p-2 text-left transition-colors ${
                  isSelected
                    ? "bg-blue-500/20 text-white"
                    : "hover:bg-white/5"
                } ${isDisabled ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`h-4 w-4 rounded border ${
                      isSelected
                        ? "border-blue-500 bg-blue-500"
                        : "border-white/30"
                    } flex items-center justify-center`}
                  >
                    {isSelected && (
                      <svg
                        className="h-3 w-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={3}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    )}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{company.name}</div>
                    {company.industry && (
                      <div className="text-xs text-white/50">
                        {INDUSTRY_LABELS[company.industry] ?? company.industry}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      {selectedIds.length > 0 && selectedIds.length < minSelection && (
        <div className="text-xs text-amber-400">
          Select at least {minSelection} companies to compare
        </div>
      )}

      <div className="text-xs text-white/40">
        {selectedIds.length} of {maxSelection} selected
      </div>
    </div>
  );
}

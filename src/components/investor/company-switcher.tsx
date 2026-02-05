"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Search, Building2 } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type Company = {
  id: string;
  name: string;
  logoUrl: string | null;
  industry: string | null;
  stage: string | null;
};

type Props = {
  currentCompanyId: string;
  currentCompanyName: string;
  companies: Company[];
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

const STAGE_LABELS: Record<string, string> = {
  seed: "Seed",
  series_a: "A",
  series_b: "B",
  series_c: "C",
  growth: "Growth",
};

export function CompanySwitcher({ currentCompanyId, currentCompanyName, companies }: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const containerRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Focus search input when dropdown opens
  React.useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Handle keyboard navigation
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
        setSearch("");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen]);

  const filteredCompanies = React.useMemo(() => {
    if (!search.trim()) return companies;
    const lowerSearch = search.toLowerCase();
    return companies.filter((c) =>
      c.name.toLowerCase().includes(lowerSearch) ||
      (c.industry && INDUSTRY_LABELS[c.industry]?.toLowerCase().includes(lowerSearch))
    );
  }, [companies, search]);

  function handleSelect(companyId: string) {
    if (companyId !== currentCompanyId) {
      router.push(`/dashboard/${companyId}`);
    }
    setIsOpen(false);
    setSearch("");
  }

  return (
    <div ref={containerRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition-colors hover:border-white/20 hover:bg-white/10"
      >
        <span className="text-lg font-semibold text-white">{currentCompanyName}</span>
        <ChevronDown className={`h-4 w-4 text-white/60 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-white/10 bg-zinc-900/95 shadow-2xl backdrop-blur-sm">
          {/* Search input */}
          <div className="border-b border-white/10 p-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="h-10 w-full rounded-lg border border-white/10 bg-black/30 pl-10 pr-3 text-sm placeholder:text-white/40 focus:border-white/20 focus:outline-none"
              />
            </div>
          </div>

          {/* Company list */}
          <div className="max-h-72 overflow-y-auto">
            {filteredCompanies.length === 0 ? (
              <div className="flex flex-col items-center py-8 text-center">
                <Building2 className="mb-2 h-8 w-8 text-white/20" />
                <p className="text-sm text-white/60">No companies found</p>
              </div>
            ) : (
              <div className="py-1">
                {filteredCompanies.map((company) => (
                  <CompanyOption
                    key={company.id}
                    company={company}
                    isSelected={company.id === currentCompanyId}
                    onClick={() => handleSelect(company.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CompanyOption({
  company,
  isSelected,
  onClick,
}: {
  company: Company;
  isSelected: boolean;
  onClick: () => void;
}) {
  const displayUrl = getCompanyLogoUrl(company.logoUrl);
  const initial = company.name.charAt(0).toUpperCase();
  const [imgError, setImgError] = React.useState(false);

  const industryLabel = company.industry
    ? INDUSTRY_LABELS[company.industry] ?? company.industry
    : null;
  const stageLabel = company.stage
    ? STAGE_LABELS[company.stage] ?? company.stage
    : null;

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-white/5 ${
        isSelected ? "bg-white/5" : ""
      }`}
    >
      {/* Logo */}
      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
        {displayUrl && !imgError ? (
          <img
            src={displayUrl}
            alt={company.name}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-sm font-medium text-white/60">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`truncate font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
            {company.name}
          </span>
          {isSelected && (
            <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-medium text-white/60">
              Current
            </span>
          )}
        </div>
        {(industryLabel || stageLabel) && (
          <div className="mt-0.5 flex items-center gap-1.5 text-xs text-white/60">
            {industryLabel && <span>{industryLabel}</span>}
            {industryLabel && stageLabel && <span>·</span>}
            {stageLabel && <span>{stageLabel}</span>}
          </div>
        )}
      </div>
    </button>
  );
}

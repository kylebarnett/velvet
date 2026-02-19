"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { X, ArrowUpRight, ArrowDownRight, TrendingUp, Building2, ArrowUpDown } from "lucide-react";
import { formatValue } from "@/components/charts/types";
import { getCompanyLogoUrl } from "@/lib/utils/logo";
import { INDUSTRY_LABELS, STAGE_LABELS_SHORT } from "@/lib/constants/industries";
import { ExportButton } from "@/components/ui/export-button";
import { downloadCsv } from "@/lib/utils/csv-export";
import { downloadExcel } from "@/lib/utils/excel-export";

export type CompanyMetricBreakdown = {
  companyId: string;
  companyName: string;
  logoUrl: string | null;
  industry: string | null;
  stage: string | null;
  value: number;
  percentOfTotal: number;
  growth: number | null;
};

type Props = {
  metricName: string;
  metricLabel: string;
  total: number;
  companies: CompanyMetricBreakdown[];
  onClose: () => void;
};

type SortKey = "value" | "growth" | "name";
type SortDirection = "asc" | "desc";

export function MetricDrilldownPanel({
  metricName,
  metricLabel,
  total,
  companies,
  onClose,
}: Props) {
  const router = useRouter();
  const [sortKey, setSortKey] = React.useState<SortKey>("value");
  const [sortDirection, setSortDirection] = React.useState<SortDirection>("desc");
  const [isVisible, setIsVisible] = React.useState(false);

  // Animate in on mount
  React.useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Handle escape key
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        handleClose();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleClose() {
    setIsVisible(false);
    setTimeout(onClose, 200);
  }

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDirection(key === "name" ? "asc" : "desc");
    }
  }

  function handleCompanyClick(companyId: string) {
    router.push(`/companies/${companyId}`);
  }

  const sortedCompanies = React.useMemo(() => {
    const sorted = [...companies].sort((a, b) => {
      let comparison = 0;
      switch (sortKey) {
        case "value":
          comparison = a.value - b.value;
          break;
        case "growth":
          const aGrowth = a.growth ?? -Infinity;
          const bGrowth = b.growth ?? -Infinity;
          comparison = aGrowth - bGrowth;
          break;
        case "name":
          comparison = a.companyName.localeCompare(b.companyName);
          break;
      }
      return sortDirection === "desc" ? -comparison : comparison;
    });
    return sorted;
  }, [companies, sortKey, sortDirection]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-bg-sidebar backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-border-default bg-bg-secondary shadow-2xl transition-transform duration-200 sm:w-[480px] ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="drilldown-title"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border-default p-6">
          <div>
            <h2
              id="drilldown-title"
              className="flex items-center gap-2 text-lg font-semibold text-text-primary"
            >
              <TrendingUp className="h-5 w-5 text-text-tertiary" />
              {metricLabel} Breakdown
            </h2>
            <p className="mt-1 text-2xl font-bold text-text-primary">
              {formatValue(total, metricName)}
            </p>
            <p className="mt-1 text-sm text-text-tertiary">
              Across {companies.length} {companies.length === 1 ? "company" : "companies"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton
              onExport={(format) => {
                const headers = ["Company", "Industry", "Stage", "Value", "% of Total", "Growth (%)"];
                const rows = sortedCompanies.map((c) => [
                  c.companyName,
                  c.industry ? (INDUSTRY_LABELS[c.industry] ?? c.industry) : "",
                  c.stage ? (STAGE_LABELS_SHORT[c.stage] ?? c.stage) : "",
                  formatValue(c.value, metricName),
                  c.percentOfTotal.toFixed(1),
                  c.growth !== null ? c.growth.toFixed(1) : "",
                ]);
                const dateStr = new Date().toISOString().split("T")[0];
                const baseName = `${metricName}-breakdown-${dateStr}`;
                if (format === "excel") {
                  void downloadExcel({ filename: baseName, headers, rows });
                } else {
                  downloadCsv(`${baseName}.csv`, headers, rows);
                }
              }}
              formats={["csv", "excel"]}
            />
            <button
              onClick={handleClose}
              className="rounded-lg p-2 text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
              aria-label="Close panel"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-2 border-b border-border-default px-6 py-3">
          <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
            Sort by
          </span>
          <div className="flex gap-1">
            <SortButton
              label="Value"
              isActive={sortKey === "value"}
              direction={sortKey === "value" ? sortDirection : undefined}
              onClick={() => handleSort("value")}
            />
            <SortButton
              label="Growth"
              isActive={sortKey === "growth"}
              direction={sortKey === "growth" ? sortDirection : undefined}
              onClick={() => handleSort("growth")}
            />
            <SortButton
              label="A-Z"
              isActive={sortKey === "name"}
              direction={sortKey === "name" ? sortDirection : undefined}
              onClick={() => handleSort("name")}
            />
          </div>
        </div>

        {/* Company List */}
        <div className="flex-1 overflow-y-auto">
          {sortedCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Building2 className="mb-3 h-10 w-10 text-text-faint" />
              <p className="text-text-tertiary">No company data available</p>
            </div>
          ) : (
            <div className="divide-y divide-border-subtle">
              {sortedCompanies.map((company) => (
                <CompanyRow
                  key={company.companyId}
                  company={company}
                  metricName={metricName}
                  onClick={() => handleCompanyClick(company.companyId)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function SortButton({
  label,
  isActive,
  direction,
  onClick,
}: {
  label: string;
  isActive: boolean;
  direction?: SortDirection;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        isActive
          ? "bg-bg-hover text-text-primary"
          : "text-text-tertiary hover:bg-bg-elevated hover:text-text-secondary"
      }`}
    >
      {label}
      {isActive && direction && (
        <ArrowUpDown className={`h-3 w-3 ${direction === "asc" ? "rotate-180" : ""}`} />
      )}
    </button>
  );
}

function CompanyRow({
  company,
  metricName,
  onClick,
}: {
  company: CompanyMetricBreakdown;
  metricName: string;
  onClick: () => void;
}) {
  const displayUrl = getCompanyLogoUrl(company.logoUrl);
  const initial = company.companyName.charAt(0).toUpperCase();
  const [imgError, setImgError] = React.useState(false);

  const industryLabel = company.industry
    ? INDUSTRY_LABELS[company.industry] ?? company.industry
    : null;
  const stageLabel = company.stage
    ? STAGE_LABELS_SHORT[company.stage] ?? company.stage
    : null;

  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 px-6 py-4 text-left transition-colors hover:bg-bg-elevated"
    >
      {/* Logo */}
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border-default bg-bg-elevated">
        {displayUrl && !imgError ? (
          <img
            src={displayUrl}
            alt={company.companyName}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <span className="text-sm font-medium text-text-tertiary">{initial}</span>
        )}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate font-medium text-text-primary group-hover:text-text-primary">
            {company.companyName}
          </span>
          <ArrowUpRight className="h-4 w-4 flex-shrink-0 text-white/0 transition-colors group-hover:text-text-tertiary" />
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-xs text-text-tertiary">
          {industryLabel && <span>{industryLabel}</span>}
          {industryLabel && stageLabel && <span>·</span>}
          {stageLabel && <span>{stageLabel}</span>}
          <span>·</span>
          <span>{company.percentOfTotal.toFixed(1)}% of total</span>
        </div>
      </div>

      {/* Value and Growth */}
      <div className="flex flex-col items-end text-right">
        <span className="text-lg font-semibold text-text-primary">
          {formatValue(company.value, metricName)}
        </span>
        {company.growth !== null && (
          <div
            className={`flex items-center gap-0.5 text-xs ${
              company.growth >= 0 ? "text-[var(--success-accent)]" : "text-[var(--error-accent)]"
            }`}
          >
            {company.growth >= 0 ? (
              <ArrowUpRight className="h-3 w-3" />
            ) : (
              <ArrowDownRight className="h-3 w-3" />
            )}
            <span>{Math.abs(company.growth).toFixed(1)}%</span>
          </div>
        )}
      </div>
    </button>
  );
}

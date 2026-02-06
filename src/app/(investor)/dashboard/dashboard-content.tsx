"use client";

import * as React from "react";
import Link from "next/link";
import { LayoutGrid, List, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { CompanyCard } from "@/components/investor/company-card";
import { CompanySearch } from "@/components/investor/company-search";
import { TileSettingsMenu } from "@/components/investor/tile-settings-menu";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type Company = {
  id: string;
  name: string;
  website: string | null;
  founder_id: string | null;
  stage: string | null;
  industry: string | null;
  approvalStatus: string;
  logoUrl: string | null;
  tilePrimaryMetric: string | null;
  tileSecondaryMetric: string | null;
};

type MetricSnapshot = {
  name: string;
  value: number | null;
  previousValue: number | null;
  percentChange: number | null;
};

type DashboardContentProps = {
  companies: Company[];
  latestMetrics: Record<string, MetricSnapshot>;
  secondaryMetrics?: Record<string, MetricSnapshot>;
};

type ViewMode = "grid" | "list";

function formatValue(value: number | null, metricName?: string): string {
  if (value == null) return "-";

  const lowerName = metricName?.toLowerCase() ?? "";

  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn")
  ) {
    return `${value.toFixed(1)}%`;
  }

  if (
    lowerName.includes("revenue") ||
    lowerName.includes("mrr") ||
    lowerName.includes("arr") ||
    lowerName.includes("burn") ||
    lowerName.includes("cost") ||
    lowerName.includes("gmv")
  ) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  }

  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function CompanyLogoSmall({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [imgError, setImgError] = React.useState(false);
  const displayUrl = getCompanyLogoUrl(logoUrl);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
      {displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-sm font-medium text-white/60">{initial}</span>
      )}
    </div>
  );
}

function TrendBadge({ percentChange }: { percentChange: number | null }) {
  if (percentChange == null) {
    return null;
  }

  if (percentChange > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-400">
        <TrendingUp className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">+{percentChange.toFixed(0)}%</span>
      </span>
    );
  }

  if (percentChange < 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-400">
        <TrendingDown className="h-3.5 w-3.5" />
        <span className="text-xs font-medium">{percentChange.toFixed(0)}%</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-white/40">
      <Minus className="h-3.5 w-3.5" />
      <span className="text-xs font-medium">0%</span>
    </span>
  );
}

function CompanyListRow({
  company,
  latestMetric,
  secondaryMetric,
}: {
  company: Company;
  latestMetric: MetricSnapshot | null;
  secondaryMetric: MetricSnapshot | null;
}) {
  const isApproved = ["auto_approved", "approved"].includes(company.approvalStatus);
  const hasFounder = !!company.founder_id;

  return (
    <Link
      href={`/dashboard/${company.id}`}
      className="card-hover-lift flex items-center gap-4 rounded-xl border border-white/[0.08] bg-white/[0.03] px-5 py-3.5 hover:border-white/15"
    >
      <CompanyLogoSmall name={company.name} logoUrl={company.logoUrl} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-white truncate">{company.name}</h3>
          {!isApproved && (
            <span className="shrink-0 rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
              Pending
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          {company.industry && (
            <span className="rounded-full bg-blue-500/10 px-2 py-0.5 text-[11px] capitalize text-blue-300/70">{company.industry.replace(/_/g, " ")}</span>
          )}
          {company.stage && (
            <span className="rounded-full bg-violet-500/10 px-2 py-0.5 text-[11px] capitalize text-violet-300/70">{company.stage.replace(/_/g, " ")}</span>
          )}
        </div>
      </div>

      <div className="hidden sm:flex items-center gap-6 shrink-0">
        {latestMetric && latestMetric.value != null ? (
          <>
            <div className="text-right">
              <div className="text-xs text-white/60">{latestMetric.name}</div>
              <div className="font-semibold">
                {formatValue(latestMetric.value, latestMetric.name)}
              </div>
            </div>
            <div className="w-16">
              <TrendBadge percentChange={latestMetric.percentChange} />
            </div>
            {secondaryMetric && secondaryMetric.value != null && (
              <>
                <div className="text-right border-l border-white/[0.06] pl-6">
                  <div className="text-xs text-white/60">{secondaryMetric.name}</div>
                  <div className="text-sm font-medium text-white/80">
                    {formatValue(secondaryMetric.value, secondaryMetric.name)}
                  </div>
                </div>
                <div className="w-16">
                  <TrendBadge percentChange={secondaryMetric.percentChange} />
                </div>
              </>
            )}
          </>
        ) : !hasFounder ? (
          <span className="text-xs text-amber-200/60">Awaiting founder signup</span>
        ) : isApproved ? (
          <span className="text-xs text-white/60">No metrics yet</span>
        ) : null}
      </div>
    </Link>
  );
}

export function DashboardContent({ companies, latestMetrics, secondaryMetrics = {} }: DashboardContentProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");

  // Filter companies based on search query
  const filteredCompanies = React.useMemo(() => {
    if (!searchQuery.trim()) return companies;

    const query = searchQuery.toLowerCase();
    return companies.filter((company) => company.name.toLowerCase().includes(query));
  }, [companies, searchQuery]);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex-1 sm:max-w-md">
          <CompanySearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search companies..."
          />
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="rounded-full bg-white/5 px-2.5 py-1 text-xs text-white/60">
            {filteredCompanies.length} of {companies.length}
          </div>
          <TileSettingsMenu
            companies={companies
              .filter(c => ["auto_approved", "approved"].includes(c.approvalStatus))
              .map(c => ({
                id: c.id,
                name: c.name,
                logoUrl: c.logoUrl,
                tilePrimaryMetric: c.tilePrimaryMetric,
                tileSecondaryMetric: c.tileSecondaryMetric,
              }))}
          />
          <div className="flex items-center rounded-lg border border-white/[0.08] bg-black/20 p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "grid"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
              title="Grid view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`rounded p-1.5 transition-colors ${
                viewMode === "list"
                  ? "bg-white/10 text-white"
                  : "text-white/40 hover:text-white/60"
              }`}
              title="List view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filteredCompanies.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No companies match your search.</p>
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              id={company.id}
              name={company.name}
              stage={company.stage}
              industry={company.industry}
              logoUrl={company.logoUrl}
              founderId={company.founder_id}
              approvalStatus={company.approvalStatus}
              latestMetric={latestMetrics[company.id] ?? null}
              secondaryMetric={secondaryMetrics[company.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredCompanies.map((company) => (
            <CompanyListRow
              key={company.id}
              company={company}
              latestMetric={latestMetrics[company.id] ?? null}
              secondaryMetric={secondaryMetrics[company.id] ?? null}
            />
          ))}
        </div>
      )}
    </div>
  );
}

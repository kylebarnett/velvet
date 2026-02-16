"use client";

import Link from "next/link";
import { TrendingUp, ChevronRight } from "lucide-react";
import { INDUSTRY_LABELS, STAGE_LABELS } from "@/lib/constants/industries";

type TopPerformersProps = {
  companies: Array<{
    companyId: string;
    companyName: string;
    industry: string | null;
    stage: string | null;
    revenueMetric: string | null;
    revenueGrowth: number | null;
  }>;
};

const STAGE_COLORS: Record<string, string> = {
  seed: "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)] ring-[var(--tag-amber-bg)]",
  series_a: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] ring-[var(--tag-blue-bg)]",
  series_b: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)] ring-[var(--tag-violet-bg)]",
  series_c: "bg-[var(--tag-pink-bg)] text-[var(--tag-pink-text)] ring-[var(--tag-pink-bg)]",
  growth: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] ring-[var(--tag-emerald-bg)]",
};

// Medal colors for top 3 — semantic decorative colors that work in both themes
const MEDAL_STYLES = [
  "bg-gradient-to-br from-amber-400 to-amber-600 text-amber-950 shadow-lg shadow-amber-500/20",
  "bg-gradient-to-br from-slate-300 to-slate-400 text-slate-800 shadow-lg shadow-slate-400/20",
  "bg-gradient-to-br from-orange-400 to-orange-600 text-orange-950 shadow-lg shadow-orange-500/20",
];

export function TopPerformers({ companies }: TopPerformersProps) {
  // Filter to only companies with growth data and get top 5
  const topCompanies = companies
    .filter((c) => c.revenueGrowth !== null)
    .slice(0, 5);

  if (topCompanies.length === 0) {
    return (
      <div className="card-surface rounded-2xl border border-border-subtle p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated ring-1 ring-border-subtle">
            <TrendingUp className="h-5 w-5 text-text-muted" />
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Top Performers</h3>
            <p className="text-xs text-text-muted">by growth rate</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">
          Not enough data to rank performers yet.
        </p>
        <p className="mt-1 text-xs text-text-muted">
          Growth rankings require at least 2 periods of data.
        </p>
      </div>
    );
  }

  return (
    <div className="card-surface flex h-full flex-col rounded-2xl border border-border-subtle">
      <div className="flex flex-1 flex-col p-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)]">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold tracking-tight text-text-primary">Top Performers</h3>
            <p className="text-xs text-text-muted">by growth rate</p>
          </div>
        </div>

        {/* Company list */}
        <div className="flex-1 space-y-2">
          {topCompanies.map((company, index) => (
            <Link
              key={company.companyId}
              href={`/companies/${company.companyId}`}
              className="group relative flex items-center gap-4 rounded-xl p-3 transition-all duration-200 hover:bg-bg-hover"
            >
              {/* Rank badge */}
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-xs font-bold ${
                  index < 3
                    ? MEDAL_STYLES[index]
                    : "bg-bg-elevated text-text-tertiary ring-1 ring-border-subtle"
                }`}
              >
                {index + 1}
              </div>

              {/* Company info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium text-text-primary group-hover:text-text-primary">
                    {company.companyName}
                  </span>
                  {company.stage && (
                    <span
                      className={`rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ${
                        STAGE_COLORS[company.stage] ?? "bg-bg-hover text-text-tertiary ring-border-default"
                      }`}
                    >
                      {STAGE_LABELS[company.stage] ?? company.stage}
                    </span>
                  )}
                </div>
                {company.industry && (
                  <div className="mt-0.5 text-xs text-text-muted">
                    {INDUSTRY_LABELS[company.industry] ?? company.industry}
                  </div>
                )}
              </div>

              {/* Growth indicator — semantic data colors */}
              <div className="flex flex-col items-end">
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    (company.revenueGrowth ?? 0) >= 0 ? "text-[var(--success-accent)]" : "text-[var(--error-accent)]"
                  }`}
                >
                  {(company.revenueGrowth ?? 0) >= 0 ? "+" : ""}
                  {company.revenueGrowth?.toFixed(1)}%
                </span>
                {company.revenueMetric && (
                  <span className="text-[10px] uppercase tracking-wide text-text-faint">
                    {company.revenueMetric}
                  </span>
                )}
              </div>

              {/* Arrow on hover */}
              <ChevronRight
                className="h-4 w-4 flex-shrink-0 text-text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-text-muted"
              />
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

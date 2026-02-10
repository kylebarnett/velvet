"use client";

import Link from "next/link";

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

const INDUSTRY_LABELS: Record<string, string> = {
  saas: "SaaS",
  fintech: "Fintech",
  healthcare: "Healthcare",
  ecommerce: "E-commerce",
  edtech: "EdTech",
  ai_ml: "AI/ML",
  other: "Other",
};

const STAGE_COLORS: Record<string, string> = {
  seed: "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)] ring-[var(--tag-amber-bg)]",
  series_a: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] ring-[var(--tag-blue-bg)]",
  series_b: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)] ring-[var(--tag-violet-bg)]",
  series_c: "bg-[var(--tag-pink-bg)] text-[var(--tag-pink-text)] ring-[var(--tag-pink-bg)]",
  growth: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] ring-[var(--tag-emerald-bg)]",
};

const STAGE_LABELS: Record<string, string> = {
  seed: "Seed",
  series_a: "Series A",
  series_b: "Series B",
  series_c: "Series C",
  growth: "Growth",
};

// Medal colors for top 3
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
      <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-6">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-500/[0.05] via-transparent to-transparent" />
        <div className="relative">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-bg-elevated ring-1 ring-border-subtle">
              <svg className="h-5 w-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-text-primary">Top Performers</h3>
              <p className="text-xs text-text-muted">by growth rate</p>
            </div>
          </div>
          <p className="text-sm text-text-tertiary">
            Not enough data to rank performers yet.
          </p>
          <p className="mt-1 text-xs text-text-faint">
            Growth rankings require at least 2 periods of data.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-violet-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20">
            <svg className="h-5 w-5 text-[var(--tag-violet-text)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-text-primary">Top Performers</h3>
            <p className="text-xs text-text-muted">by growth rate</p>
          </div>
        </div>

        {/* Company list */}
        <div className="space-y-2">
          {topCompanies.map((company, index) => (
            <Link
              key={company.companyId}
              href={`/dashboard/${company.companyId}`}
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

              {/* Growth indicator */}
              <div className="flex flex-col items-end">
                <span
                  className={`text-lg font-semibold tabular-nums ${
                    (company.revenueGrowth ?? 0) >= 0 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {(company.revenueGrowth ?? 0) >= 0 ? "+" : ""}
                  {company.revenueGrowth?.toFixed(1)}%
                </span>
                {company.revenueMetric && (
                  <span className="text-[10px] uppercase tracking-wider text-text-faint">
                    {company.revenueMetric}
                  </span>
                )}
              </div>

              {/* Arrow on hover */}
              <svg
                className="h-4 w-4 flex-shrink-0 text-text-faint transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-text-muted"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

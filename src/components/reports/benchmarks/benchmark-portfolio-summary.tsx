"use client";

import { cn } from "@/lib/utils/cn";
import { getPercentileBgColor } from "@/lib/benchmarks/calculate";

type CompanyBenchmark = {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  percentile: number | null;
  industry: string | null;
  stage: string | null;
};

type BenchmarkData = {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
  sample_size: number;
  calculated_at: string;
};

type BenchmarkPortfolioSummaryProps = {
  companies: CompanyBenchmark[];
  benchmark: BenchmarkData;
};

function getQuartile(percentile: number): number {
  if (percentile < 25) return 1;
  if (percentile < 50) return 2;
  if (percentile < 75) return 3;
  return 4;
}

const QUARTILE_COLORS: Record<number, { bg: string; text: string }> = {
  1: { bg: "bg-[var(--status-error-bg)]", text: "text-[var(--status-error-text)]" },
  2: { bg: "bg-[var(--status-warning-bg)]", text: "text-[var(--status-warning-text)]" },
  3: { bg: "bg-[var(--status-info-bg)]", text: "text-[var(--status-info-text)]" },
  4: { bg: "bg-[var(--success-bg-muted)]", text: "text-[var(--status-success-text)]" },
};

export function BenchmarkPortfolioSummary({
  companies,
  benchmark,
}: BenchmarkPortfolioSummaryProps) {
  const aboveMedian = companies.filter((c) => c.value > benchmark.p50).length;
  const companiesWithPercentile = companies.filter((c) => c.percentile !== null);

  const avgPercentile =
    companiesWithPercentile.length > 0
      ? Math.round(
          companiesWithPercentile.reduce((sum, c) => sum + (c.percentile ?? 0), 0) /
          companiesWithPercentile.length
        )
      : null;

  // Quartile distribution
  const quartiles = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const c of companiesWithPercentile) {
    const q = getQuartile(c.percentile!);
    quartiles[q as keyof typeof quartiles]++;
  }

  const totalWithPercentile = companiesWithPercentile.length;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {/* Above Median */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Above Median
        </div>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums text-text-primary">
            {aboveMedian}
          </span>
          <span className="text-sm text-text-tertiary">of {companies.length}</span>
        </div>
        {/* Mini bar */}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-bg-hover">
          <div
            className="h-full rounded-full bg-[var(--success-accent)]"
            style={{ width: `${companies.length > 0 ? (aboveMedian / companies.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Avg Percentile */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Avg Percentile
        </div>
        <div className="mt-2">
          {avgPercentile !== null ? (
            <span
              className={cn(
                "inline-flex items-center rounded-md px-2.5 py-1 text-xl font-semibold tabular-nums",
                getPercentileBgColor(avgPercentile)
              )}
            >
              P{avgPercentile}
            </span>
          ) : (
            <span className="text-lg text-text-faint">-</span>
          )}
        </div>
        <p className="mt-1 text-[10px] text-text-faint">
          Across {companiesWithPercentile.length} companies with percentile data
        </p>
      </div>

      {/* Quartile Distribution */}
      <div className="card-surface rounded-xl border border-border-subtle p-4">
        <div className="text-xs font-medium uppercase tracking-wider text-text-muted">
          Quartile Distribution
        </div>
        <div className="mt-2 flex items-center gap-1">
          {([1, 2, 3, 4] as const).map((q) => {
            const count = quartiles[q];
            const pct = totalWithPercentile > 0 ? (count / totalWithPercentile) * 100 : 0;
            const colors = QUARTILE_COLORS[q];

            return (
              <div
                key={q}
                className="group relative flex-1"
                title={`Q${q}: ${count} companies (${Math.round(pct)}%)`}
              >
                <div
                  className={cn(
                    "flex h-8 items-center justify-center rounded-md text-xs font-semibold tabular-nums",
                    colors.bg,
                    colors.text
                  )}
                >
                  {count > 0 ? count : ""}
                </div>
                <div className="mt-1 text-center text-[9px] text-text-faint">Q{q}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

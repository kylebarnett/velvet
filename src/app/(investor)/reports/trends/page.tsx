import { requireRole } from "@/lib/auth/require-role";

export const dynamic = "force-dynamic";

export default async function TrendsPage() {
  await requireRole("investor");

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
          <svg
            className="h-6 w-6 text-white/60"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium">Trend Analysis</h3>
        <p className="mt-2 text-sm text-white/60">
          Advanced trend analysis is coming soon.
        </p>
        <p className="mt-1 text-sm text-white/40">
          This will include growth distribution histograms, year-over-year comparisons,
          and outlier detection.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Coming Soon Cards */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white/80">Growth Distribution</h4>
          <p className="mt-1 text-xs text-white/50">
            Histogram showing distribution of growth rates across your portfolio.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white/80">Year-over-Year</h4>
          <p className="mt-1 text-xs text-white/50">
            Compare performance across the same periods in different years.
          </p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <h4 className="text-sm font-medium text-white/80">Outlier Detection</h4>
          <p className="mt-1 text-xs text-white/50">
            Automatically highlight companies performing above or below average.
          </p>
        </div>
      </div>
    </div>
  );
}

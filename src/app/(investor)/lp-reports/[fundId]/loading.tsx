export default function FundDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded bg-white/5" />

      {/* Fund header */}
      <div className="space-y-2">
        <div className="h-7 w-48 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
      </div>

      {/* Performance KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-7 w-20 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Investment table */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-4 flex items-center justify-between">
          <div className="h-5 w-28 animate-pulse rounded bg-white/10" />
          <div className="h-9 w-32 animate-pulse rounded bg-white/5" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4 border-t border-white/5 py-3">
            <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
    </div>
  );
}

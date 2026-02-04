export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header + tabs */}
      <div className="h-8 w-32 animate-pulse rounded-md bg-white/5" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-white/5" />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-36 animate-pulse rounded-md bg-white/5" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-7 w-28 animate-pulse rounded bg-white/10" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-64 animate-pulse rounded-xl border border-white/10 bg-white/5" />
    </div>
  );
}

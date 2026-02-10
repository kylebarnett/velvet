export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header + tabs */}
      <div className="h-8 w-32 animate-pulse rounded-md bg-bg-elevated" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-9 w-24 animate-pulse rounded-md bg-bg-elevated" />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-36 animate-pulse rounded-md bg-bg-elevated" />
        ))}
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <div className="h-3 w-20 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-7 w-28 animate-pulse rounded bg-bg-hover" />
            <div className="mt-1 h-3 w-16 animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="h-64 animate-pulse rounded-xl border border-border-default bg-bg-elevated" />
    </div>
  );
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-36 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-white/[0.03]" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-5 md:grid-cols-3">
        {["kpi-gradient-blue", "kpi-gradient-amber", "kpi-gradient-emerald"].map(
          (gradient, i) => (
            <div
              key={i}
              className={`rounded-xl border border-white/[0.08] ${gradient} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className="h-3 w-28 animate-pulse rounded bg-white/5" />
                <div className="h-4 w-4 animate-pulse rounded bg-white/5" />
              </div>
              <div className="mt-3 h-9 w-16 animate-pulse rounded bg-white/5" />
            </div>
          )
        )}
      </div>

      {/* Search bar skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-black/20 border border-white/[0.08]" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-16 animate-pulse rounded-full bg-white/5" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-white/[0.03] border border-white/[0.08]" />
        </div>
      </div>

      {/* Company cards grid skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-white/5" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-white/5" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-blue-500/5" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-violet-500/5" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-3">
              <div className="h-3 w-16 animate-pulse rounded bg-white/5" />
              <div className="h-6 w-24 animate-pulse rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

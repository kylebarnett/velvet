export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      {/* Header skeleton */}
      <div className="space-y-1">
        <div className="h-7 w-36 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-bg-raised" />
      </div>

      {/* KPI cards skeleton */}
      <div className="grid gap-5 md:grid-cols-3">
        {["kpi-gradient-blue", "kpi-gradient-amber", "kpi-gradient-emerald"].map(
          (gradient, i) => (
            <div
              key={i}
              className={`rounded-xl border border-border-subtle ${gradient} p-5`}
            >
              <div className="flex items-start justify-between">
                <div className="h-3 w-28 animate-pulse rounded bg-bg-elevated" />
                <div className="h-4 w-4 animate-pulse rounded bg-bg-elevated" />
              </div>
              <div className="mt-3 h-9 w-16 animate-pulse rounded bg-bg-elevated" />
            </div>
          )
        )}
      </div>

      {/* Search bar skeleton */}
      <div className="flex items-center justify-between gap-4">
        <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-bg-input border border-border-subtle" />
        <div className="flex items-center gap-3">
          <div className="h-7 w-16 animate-pulse rounded-full bg-bg-elevated" />
          <div className="h-8 w-20 animate-pulse rounded-lg bg-bg-raised border border-border-subtle" />
        </div>
      </div>

      {/* Company cards grid skeleton */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-subtle bg-bg-raised p-5"
          >
            <div className="flex items-start gap-3">
              <div className="h-11 w-11 animate-pulse rounded-xl bg-bg-elevated" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-28 animate-pulse rounded bg-bg-elevated" />
                <div className="flex gap-1.5">
                  <div className="h-5 w-14 animate-pulse rounded-full bg-[var(--info-bg-subtle)]" />
                  <div className="h-5 w-16 animate-pulse rounded-full bg-[var(--violet-bg-subtle)]" />
                </div>
              </div>
            </div>
            <div className="mt-4 space-y-2 border-t border-border-subtle pt-3">
              <div className="h-3 w-16 animate-pulse rounded bg-bg-elevated" />
              <div className="h-6 w-24 animate-pulse rounded bg-bg-elevated" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

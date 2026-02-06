export default function BenchmarksLoading() {
  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-20 animate-pulse rounded bg-white/10" />
              <div className="h-11 animate-pulse rounded-md bg-white/[0.06]" />
            </div>
          ))}
        </div>
      </div>

      {/* Percentile band summary */}
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-6 w-20 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 h-4 w-48 animate-pulse rounded bg-white/10" />
        <div className="h-80 animate-pulse rounded-xl bg-white/[0.03]" />
      </div>

      {/* Table placeholder */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 animate-pulse rounded-lg bg-white/[0.03]"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

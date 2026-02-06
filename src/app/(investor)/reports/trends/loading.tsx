export default function TrendsLoading() {
  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-44 animate-pulse rounded-md bg-white/5" />
        ))}
      </div>

      {/* Growth Distribution */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />
      </div>

      {/* YoY Comparison */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-white/10" />
        <div className="h-64 animate-pulse rounded-xl bg-white/[0.03]" />
      </div>

      {/* Outlier table */}
      <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent p-5">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.03]" />
          ))}
        </div>
      </div>
    </div>
  );
}

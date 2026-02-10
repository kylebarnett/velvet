export default function TrendsLoading() {
  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 w-44 animate-pulse rounded-md bg-bg-elevated" />
        ))}
      </div>

      {/* Growth Distribution */}
      <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-xl bg-bg-raised" />
      </div>

      {/* YoY Comparison */}
      <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-bg-hover" />
        <div className="h-64 animate-pulse rounded-xl bg-bg-raised" />
      </div>

      {/* Outlier table */}
      <div className="rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent p-5">
        <div className="mb-4 h-5 w-32 animate-pulse rounded bg-bg-hover" />
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-lg bg-bg-raised" />
          ))}
        </div>
      </div>
    </div>
  );
}

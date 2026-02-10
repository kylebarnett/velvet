export default function PortfolioLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-bg-elevated" />
        <div className="flex gap-2">
          <div className="h-10 w-28 animate-pulse rounded-md bg-bg-elevated" />
          <div className="h-10 w-28 animate-pulse rounded-md bg-bg-elevated" />
        </div>
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border-default bg-bg-elevated">
        <div className="border-b border-border-default px-4 py-3">
          <div className="flex gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
            ))}
          </div>
        </div>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex gap-4 border-b border-border-subtle px-4 py-3 last:border-0"
          >
            {Array.from({ length: 5 }).map((_, j) => (
              <div key={j} className="h-4 w-24 animate-pulse rounded bg-bg-elevated" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

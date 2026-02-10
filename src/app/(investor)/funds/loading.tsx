export default function LPReportsLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-40 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Fund cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default card-surface p-5"
          >
            <div className="h-5 w-32 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-3 w-20 animate-pulse rounded bg-bg-elevated" />
            <div className="mt-4 flex gap-4">
              <div className="h-10 w-16 animate-pulse rounded bg-bg-elevated" />
              <div className="h-10 w-16 animate-pulse rounded bg-bg-elevated" />
              <div className="h-10 w-16 animate-pulse rounded bg-bg-elevated" />
            </div>
            <div className="mt-4 h-8 w-full animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}

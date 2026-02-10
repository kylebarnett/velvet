export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-7 w-52 animate-pulse rounded-md bg-bg-elevated" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-bg-elevated" />
      </div>

      {/* Controls skeleton */}
      <div className="rounded-xl border border-border-default card-surface p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-20 animate-pulse rounded bg-bg-elevated" />
              <div className="h-11 animate-pulse rounded-md bg-bg-hover" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border border-border-default card-surface p-4">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-bg-hover" />
        <div className="h-[360px] animate-pulse rounded-lg bg-bg-raised" />
      </div>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-bg-elevated" />

      {/* Filter bar placeholder */}
      <div className="flex gap-3">
        <div className="h-9 w-40 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Report rows placeholder */}
      <div className="rounded-xl border border-border-default bg-bg-elevated divide-y divide-border-subtle">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-4 animate-pulse rounded bg-bg-hover" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
              <div className="h-3 w-32 animate-pulse rounded bg-bg-hover" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

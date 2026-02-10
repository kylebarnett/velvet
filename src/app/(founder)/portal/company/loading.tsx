export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-bg-elevated" />
      </div>
      <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-bg-hover" />
              <div className="space-y-1.5">
                <div className="h-3 w-16 animate-pulse rounded bg-bg-hover" />
                <div className="h-4 w-32 animate-pulse rounded bg-bg-hover" />
              </div>
            </div>
            <div className="h-9 w-28 animate-pulse rounded-md bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

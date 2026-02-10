export default function FounderRequestsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-bg-elevated" />

      {/* Request cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border-default card-surface p-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 animate-pulse rounded bg-bg-hover" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-bg-elevated" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-64 animate-pulse rounded bg-bg-elevated" />
            <div className="h-3 w-40 animate-pulse rounded bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

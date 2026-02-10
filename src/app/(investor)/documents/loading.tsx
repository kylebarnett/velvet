export default function DocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-10 w-48 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-border-default bg-bg-elevated">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border-subtle px-4 py-3 last:border-0"
          >
            <div className="h-4 w-4 animate-pulse rounded bg-bg-hover" />
            <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
            <div className="h-4 w-24 animate-pulse rounded bg-bg-elevated" />
            <div className="h-4 w-20 animate-pulse rounded bg-bg-elevated" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}

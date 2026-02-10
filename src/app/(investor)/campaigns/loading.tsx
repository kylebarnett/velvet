export default function RequestsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
            <div className="mt-3 h-7 w-12 animate-pulse rounded bg-bg-hover" />
          </div>
        ))}
      </div>

      {/* Campaign card skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border-subtle bg-bg-raised p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 animate-pulse rounded bg-bg-hover" />
              <div className="h-4 w-16 animate-pulse rounded-full bg-bg-hover" />
            </div>
            <div className="h-1.5 w-full animate-pulse rounded-full bg-bg-hover" />
            <div className="flex items-center gap-2">
              <div className="h-3.5 w-3.5 animate-pulse rounded bg-bg-hover" />
              <div className="h-3 w-40 animate-pulse rounded bg-bg-hover" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

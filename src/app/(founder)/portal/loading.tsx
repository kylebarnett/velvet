export default function PortalLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="h-8 w-40 animate-pulse rounded-md bg-bg-elevated" />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-7 w-16 animate-pulse rounded bg-bg-hover" />
          </div>
        ))}
      </div>

      {/* Content area */}
      <div className="h-48 animate-pulse rounded-xl border border-border-default bg-bg-elevated" />
    </div>
  );
}

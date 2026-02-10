export default function TearSheetsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Tear sheet cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <div className="h-5 w-40 animate-pulse rounded bg-bg-hover" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-bg-elevated" />
            <div className="mt-4 h-20 animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}

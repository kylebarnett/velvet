export default function QueryLoading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-8 w-40 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-72 animate-pulse rounded-md bg-white/5" />
      </div>

      {/* Input skeleton */}
      <div className="h-12 animate-pulse rounded-xl border border-white/10 bg-white/5" />

      {/* Suggested queries grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

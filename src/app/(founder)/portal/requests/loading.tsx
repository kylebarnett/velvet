export default function FounderRequestsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-40 animate-pulse rounded-md bg-white/5" />

      {/* Request cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-center justify-between">
            <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-white/5" />
          </div>
          <div className="mt-3 space-y-2">
            <div className="h-3 w-64 animate-pulse rounded bg-white/5" />
            <div className="h-3 w-40 animate-pulse rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

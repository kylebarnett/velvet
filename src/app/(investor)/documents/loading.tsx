export default function DocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="h-8 w-36 animate-pulse rounded-md bg-white/5" />

      {/* Filter bar */}
      <div className="flex gap-3">
        <div className="h-10 w-48 animate-pulse rounded-md bg-white/5" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-white/5" />
        <div className="h-10 w-36 animate-pulse rounded-md bg-white/5" />
      </div>

      {/* Table skeleton */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-white/5 px-4 py-3 last:border-0"
          >
            <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
            <div className="h-4 w-24 animate-pulse rounded bg-white/5" />
            <div className="h-4 w-20 animate-pulse rounded bg-white/5" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

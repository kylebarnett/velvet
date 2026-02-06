export default function Loading() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="h-7 w-52 animate-pulse rounded-md bg-white/5" />
        <div className="mt-2 h-4 w-80 animate-pulse rounded bg-white/5" />
      </div>

      {/* Controls skeleton */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="mb-1.5 h-3 w-20 animate-pulse rounded bg-white/5" />
              <div className="h-11 animate-pulse rounded-md bg-white/10" />
            </div>
          ))}
        </div>
      </div>

      {/* Chart skeleton */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-4">
        <div className="mb-3 h-4 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-[360px] animate-pulse rounded-lg bg-white/[0.03]" />
      </div>
    </div>
  );
}

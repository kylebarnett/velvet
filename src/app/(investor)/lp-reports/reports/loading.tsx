export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-8 w-48 animate-pulse rounded-md bg-white/5" />

      {/* Filter bar placeholder */}
      <div className="flex gap-3">
        <div className="h-9 w-40 animate-pulse rounded-md bg-white/5" />
        <div className="h-9 w-40 animate-pulse rounded-md bg-white/5" />
      </div>

      {/* Report rows placeholder */}
      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/[0.04]">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-3">
            <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
              <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

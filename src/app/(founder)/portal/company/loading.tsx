export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-40 animate-pulse rounded-md bg-white/5" />
        <div className="h-4 w-64 animate-pulse rounded-md bg-white/5" />
      </div>
      <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/[0.06]">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 animate-pulse rounded-lg bg-white/10" />
              <div className="space-y-1.5">
                <div className="h-3 w-16 animate-pulse rounded bg-white/10" />
                <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
              </div>
            </div>
            <div className="h-9 w-28 animate-pulse rounded-md bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

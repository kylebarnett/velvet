export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded bg-white/5" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-white/5" />
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-white/5" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-white/5" />
          <div className="h-9 w-16 animate-pulse rounded-md bg-white/5" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-white/5" />
        </div>
      </div>

      {/* Two-column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor column */}
        <div className="space-y-4">
          {/* Metadata card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-white/10" />
            <div className="mt-4 space-y-3">
              <div className="h-11 w-full animate-pulse rounded-md bg-white/5" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-11 animate-pulse rounded-md bg-white/5" />
                <div className="h-11 animate-pulse rounded-md bg-white/5" />
                <div className="h-11 animate-pulse rounded-md bg-white/5" />
              </div>
            </div>
          </div>

          {/* Investment selection card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
                  <div className="h-4 w-32 animate-pulse rounded bg-white/5" />
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* KPI card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-3 w-28 animate-pulse rounded bg-white/10" />
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2">
                  <div className="h-2 w-8 animate-pulse rounded bg-white/10" />
                  <div className="mt-1 h-5 w-10 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
          </div>

          {/* Rich text card */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
            <div className="mt-3 h-24 w-full animate-pulse rounded-md bg-white/5" />
          </div>
        </div>

        {/* Preview column */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="h-3 w-20 animate-pulse rounded bg-white/10" />
          <div className="mt-2 h-6 w-48 animate-pulse rounded bg-white/5" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded bg-white/5" />
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="h-2 w-8 animate-pulse rounded bg-white/10" />
                  <div className="mt-2 h-5 w-12 animate-pulse rounded bg-white/5" />
                </div>
              ))}
            </div>
            <div className="h-20 w-full animate-pulse rounded bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

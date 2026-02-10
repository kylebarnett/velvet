export default function Loading() {
  return (
    <div className="space-y-4">
      {/* Back link */}
      <div className="h-4 w-24 animate-pulse rounded bg-bg-elevated" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 animate-pulse rounded bg-bg-elevated" />
          <div className="mt-1 h-3 w-24 animate-pulse rounded bg-bg-elevated" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 animate-pulse rounded-md bg-bg-elevated" />
          <div className="h-9 w-16 animate-pulse rounded-md bg-bg-elevated" />
          <div className="h-9 w-20 animate-pulse rounded-md bg-bg-elevated" />
        </div>
      </div>

      {/* Two-column skeleton */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Editor column */}
        <div className="space-y-4">
          {/* Metadata card */}
          <div className="rounded-xl border border-border-default card-surface p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-bg-hover" />
            <div className="mt-4 space-y-3">
              <div className="h-11 w-full animate-pulse rounded-md bg-bg-elevated" />
              <div className="grid grid-cols-3 gap-3">
                <div className="h-11 animate-pulse rounded-md bg-bg-elevated" />
                <div className="h-11 animate-pulse rounded-md bg-bg-elevated" />
                <div className="h-11 animate-pulse rounded-md bg-bg-elevated" />
              </div>
            </div>
          </div>

          {/* Investment selection card */}
          <div className="rounded-xl border border-border-default card-surface p-4">
            <div className="h-3 w-32 animate-pulse rounded bg-bg-hover" />
            <div className="mt-4 space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  <div className="h-4 w-4 animate-pulse rounded bg-bg-hover" />
                  <div className="h-4 w-32 animate-pulse rounded bg-bg-elevated" />
                  <div className="ml-auto h-4 w-20 animate-pulse rounded bg-bg-elevated" />
                </div>
              ))}
            </div>
          </div>

          {/* KPI card */}
          <div className="rounded-xl border border-border-default card-surface p-4">
            <div className="h-3 w-28 animate-pulse rounded bg-bg-hover" />
            <div className="mt-3 grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border-subtle bg-bg-raised p-2">
                  <div className="h-2 w-8 animate-pulse rounded bg-bg-hover" />
                  <div className="mt-1 h-5 w-10 animate-pulse rounded bg-bg-elevated" />
                </div>
              ))}
            </div>
          </div>

          {/* Rich text card */}
          <div className="rounded-xl border border-border-default card-surface p-4">
            <div className="h-3 w-32 animate-pulse rounded bg-bg-hover" />
            <div className="mt-3 h-24 w-full animate-pulse rounded-md bg-bg-elevated" />
          </div>
        </div>

        {/* Preview column */}
        <div className="rounded-xl border border-border-default card-surface p-6">
          <div className="h-3 w-20 animate-pulse rounded bg-bg-hover" />
          <div className="mt-2 h-6 w-48 animate-pulse rounded bg-bg-elevated" />
          <div className="mt-1 h-4 w-32 animate-pulse rounded bg-bg-elevated" />
          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-5 gap-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-lg border border-border-subtle bg-bg-raised p-3">
                  <div className="h-2 w-8 animate-pulse rounded bg-bg-hover" />
                  <div className="mt-2 h-5 w-12 animate-pulse rounded bg-bg-elevated" />
                </div>
              ))}
            </div>
            <div className="h-20 w-full animate-pulse rounded bg-bg-elevated" />
          </div>
        </div>
      </div>
    </div>
  );
}

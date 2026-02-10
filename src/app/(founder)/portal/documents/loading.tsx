export default function FounderDocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-bg-elevated" />
      </div>

      {/* Document list */}
      <div className="rounded-xl border border-border-default card-surface">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 border-b border-border-subtle px-4 py-3 last:border-0"
          >
            <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
            <div className="h-4 w-24 animate-pulse rounded bg-bg-elevated" />
            <div className="ml-auto h-4 w-16 animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}

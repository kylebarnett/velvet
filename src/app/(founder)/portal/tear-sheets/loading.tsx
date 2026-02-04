export default function TearSheetsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-36 animate-pulse rounded-md bg-white/5" />
        <div className="h-10 w-32 animate-pulse rounded-md bg-white/5" />
      </div>

      {/* Tear sheet cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/10 bg-white/5 p-4"
          >
            <div className="h-5 w-40 animate-pulse rounded bg-white/10" />
            <div className="mt-2 h-3 w-24 animate-pulse rounded bg-white/5" />
            <div className="mt-4 h-20 animate-pulse rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

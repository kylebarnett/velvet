export default function FounderInvestorsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />

      {/* Investor cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <div className="flex items-center justify-between">
              <div className="h-5 w-36 animate-pulse rounded bg-bg-hover" />
              <div className="h-6 w-20 animate-pulse rounded-full bg-bg-elevated" />
            </div>
            <div className="mt-3 h-3 w-48 animate-pulse rounded bg-bg-elevated" />
          </div>
        ))}
      </div>
    </div>
  );
}

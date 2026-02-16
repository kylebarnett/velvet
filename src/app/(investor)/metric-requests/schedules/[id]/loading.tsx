export default function ScheduleDetailLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-56 rounded bg-bg-hover" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-48 rounded bg-bg-hover" />
          <div className="h-4 w-32 rounded bg-bg-hover" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-24 rounded-md bg-bg-hover" />
          <div className="h-9 w-24 rounded-md bg-bg-hover" />
          <div className="h-9 w-9 rounded-md bg-bg-hover" />
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-default p-4 space-y-2">
            <div className="h-4 w-20 rounded bg-bg-hover" />
            <div className="h-5 w-28 rounded bg-bg-hover" />
          </div>
        ))}
      </div>

      {/* Run history */}
      <div className="space-y-3">
        <div className="h-5 w-32 rounded bg-bg-hover" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between">
              <div className="h-4 w-32 rounded bg-bg-hover" />
              <div className="h-5 w-16 rounded-full bg-bg-hover" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

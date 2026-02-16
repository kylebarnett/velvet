export default function TearSheetLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Back link */}
      <div className="h-4 w-32 rounded bg-bg-hover" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-7 w-56 rounded bg-bg-hover" />
          <div className="h-4 w-32 rounded bg-bg-hover" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-20 rounded-md bg-bg-hover" />
          <div className="h-9 w-20 rounded-md bg-bg-hover" />
        </div>
      </div>

      {/* Editor / Preview split */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border-default p-6 space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 rounded bg-bg-hover" />
              <div className="h-10 w-full rounded-md bg-bg-hover" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border-default p-6 space-y-4">
          <div className="h-6 w-32 rounded bg-bg-hover" />
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-full rounded bg-bg-hover" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

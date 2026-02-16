export default function PublicTearSheetLoading() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 animate-pulse p-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <div className="mx-auto h-7 w-48 rounded bg-bg-hover" />
        <div className="mx-auto h-4 w-32 rounded bg-bg-hover" />
      </div>

      {/* Content */}
      <div className="rounded-xl border border-border-default p-6 space-y-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-full rounded bg-bg-hover" />
            <div className="h-4 w-3/4 rounded bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

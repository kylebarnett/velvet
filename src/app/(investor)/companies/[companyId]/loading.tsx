export default function CompanyDetailLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Breadcrumbs */}
      <div className="h-4 w-48 rounded bg-bg-hover" />

      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-lg bg-bg-hover" />
        <div className="space-y-2">
          <div className="h-6 w-48 rounded bg-bg-hover" />
          <div className="h-4 w-32 rounded bg-bg-hover" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-border-default pb-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-24 rounded bg-bg-hover" />
        ))}
      </div>

      {/* Content area */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-border-default p-4 space-y-3">
            <div className="h-4 w-24 rounded bg-bg-hover" />
            <div className="h-8 w-32 rounded bg-bg-hover" />
            <div className="h-3 w-20 rounded bg-bg-hover" />
          </div>
        ))}
      </div>
    </div>
  );
}

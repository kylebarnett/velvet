import { Suspense } from "react";

export default function ReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20">
          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-white">Portfolio Summary</h1>
          <p className="text-sm text-white/60">
            Aggregated metrics across your portfolio
          </p>
        </div>
      </div>

      {/* Content */}
      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="h-12 w-full animate-pulse rounded-2xl bg-white/[0.03]" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/[0.03]" />
              ))}
            </div>
          </div>
        }
      >
        {children}
      </Suspense>
    </div>
  );
}

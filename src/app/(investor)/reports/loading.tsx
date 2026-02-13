import { Skeleton, KPICardSkeleton } from "@/components/ui/skeleton";

export default function ReportsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header + tabs */}
      <Skeleton className="h-8 w-32" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-36" />
        ))}
      </div>

      {/* KPI cards */}
      <KPICardSkeleton count={4} />

      {/* Chart placeholder */}
      <Skeleton className="h-64 rounded-xl border border-border-default" />
    </div>
  );
}

import { Skeleton, KPICardSkeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function FundDetailLoading() {
  return (
    <div className="space-y-6">
      {/* Back link */}
      <Skeleton className="h-4 w-24" />

      {/* Fund header */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Performance KPI cards */}
      <KPICardSkeleton count={5} className="lg:grid-cols-5" />

      {/* Investment table */}
      <SkeletonTable rows={4} columns={4} />

      {/* Chart placeholder */}
      <Skeleton className="h-64 rounded-xl border border-border-default" />
    </div>
  );
}

import { Skeleton, KPICardSkeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function RequestsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary cards */}
      <KPICardSkeleton count={2} className="grid-cols-2 lg:grid-cols-2" />

      {/* Campaign card skeletons */}
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-xl border border-border-subtle bg-bg-raised p-5"
        >
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
            <Skeleton className="h-1.5 w-full rounded-full" />
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-3.5" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

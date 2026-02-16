import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-40" />
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-28" />
        </div>
      </div>

      {/* Table skeleton */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

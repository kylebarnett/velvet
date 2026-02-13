import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function DocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-36" />

      {/* Filter bar */}
      <div className="flex gap-3">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-36" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table skeleton */}
      <SkeletonTable rows={8} columns={5} />
    </div>
  );
}

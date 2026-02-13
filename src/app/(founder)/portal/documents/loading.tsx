import { Skeleton, SkeletonTable } from "@/components/ui/skeleton";

export default function FounderDocumentsLoading() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Document list */}
      <SkeletonTable rows={5} columns={3} />
    </div>
  );
}

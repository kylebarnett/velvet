import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function FounderRequestsLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-40" />

      {/* Request cards */}
      {Array.from({ length: 4 }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}

import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function FounderInvestorsLoading() {
  return (
    <div className="space-y-6 p-6">
      <Skeleton className="h-8 w-36" />

      {/* Investor cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}

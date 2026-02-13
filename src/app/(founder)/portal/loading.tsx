import { Skeleton, KPICardSkeleton } from "@/components/ui/skeleton";

export default function PortalLoading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-40" />

      {/* Stat cards */}
      <KPICardSkeleton count={4} />

      {/* Content area */}
      <Skeleton className="h-48 rounded-xl border border-border-default" />
    </div>
  );
}

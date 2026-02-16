import dynamic from "next/dynamic";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";

const UnifiedRequestWizard = dynamic(
  () =>
    import("@/components/forms/unified-request-wizard").then((mod) => ({
      default: mod.UnifiedRequestWizard,
    })),
  {
    loading: () => (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="h-8 w-36 animate-pulse rounded-md bg-bg-elevated" />
          <div className="h-10 w-32 animate-pulse rounded-md bg-bg-elevated" />
        </div>
        {/* Step indicators */}
        <div className="flex items-center gap-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-2 w-20 animate-pulse rounded-full bg-bg-elevated"
            />
          ))}
        </div>
        {/* Form skeleton */}
        <div className="rounded-xl border border-border-default card-surface p-6">
          <div className="space-y-4">
            <div className="h-5 w-40 animate-pulse rounded bg-bg-hover" />
            <div className="h-11 w-full animate-pulse rounded-md bg-bg-hover" />
            <div className="h-11 w-full animate-pulse rounded-md bg-bg-hover" />
            <div className="h-11 w-2/3 animate-pulse rounded-md bg-bg-hover" />
          </div>
        </div>
      </div>
    ),
  }
);

export default function NewRequestPage() {
  return (
    <div className="space-y-4">
      <Breadcrumbs items={[{ label: "Companies", href: "/companies" }, { label: "Metric Requests", href: "/metric-requests" }, { label: "New Request" }]} />
      <UnifiedRequestWizard />
    </div>
  );
}

import { Suspense } from "react";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { ActivityClient } from "@/components/founder/activity/activity-client";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <Breadcrumbs items={[{ label: "Dashboard", href: "/portal" }, { label: "Activity" }]} />
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">Activity</h1>
        <p className="text-sm text-text-tertiary">
          See when investors access your data.
        </p>
      </div>

      <Suspense>
        <ActivityClient />
      </Suspense>
    </div>
  );
}

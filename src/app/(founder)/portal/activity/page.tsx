import { Suspense } from "react";
import { ActivityClient } from "@/components/founder/activity/activity-client";

export default function ActivityPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Activity</h1>
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

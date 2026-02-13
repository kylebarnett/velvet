"use client";

import * as React from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { InvestorSection } from "./investor-section";
import type { ActivityEntry } from "./types";

interface ActivityGroupedProps {
  selectedActorId: string | null;
}

function GroupedSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className="rounded-xl border border-border-default card-surface p-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-bg-hover" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-36 rounded bg-bg-hover" />
            </div>
            <div className="h-5 w-8 rounded-full bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityGrouped({ selectedActorId }: ActivityGroupedProps) {
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // Fetch a larger batch for meaningful grouping
        const params = new URLSearchParams({ limit: "100", offset: "0" });
        if (selectedActorId) params.set("actor_id", selectedActorId);

        const res = await fetch(`/api/activity-log?${params}`);
        if (!res.ok) throw new Error("Failed to load activity.");
        const json = await res.json();
        if (!cancelled) {
          setActivities(json.activities ?? []);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Something went wrong.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [selectedActorId]);

  if (error) {
    return (
      <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]" role="alert">
        {error}
      </div>
    );
  }

  if (loading) return <GroupedSkeleton />;

  // Group by actor_id
  const groups = new Map<string, ActivityEntry[]>();
  for (const a of activities) {
    const list = groups.get(a.actor_id);
    if (list) {
      list.push(a);
    } else {
      groups.set(a.actor_id, [a]);
    }
  }

  // Sort groups by most recent activity first (entries already sorted by created_at DESC from API)
  const sortedGroups = [...groups.entries()].sort((a, b) => {
    const aLatest = a[1][0]?.created_at ?? "";
    const bLatest = b[1][0]?.created_at ?? "";
    return bLatest > aLatest ? 1 : bLatest < aLatest ? -1 : 0;
  });

  if (sortedGroups.length === 0) {
    return (
      <EmptyState
        variant="inline"
        title="No activity yet"
        description={
          selectedActorId
            ? "No activity found for this investor."
            : "When investors view your dashboard, download documents, or export data, their activity will appear here."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {sortedGroups.map(([actorId, entries], index) => (
        <InvestorSection
          key={actorId}
          actorId={actorId}
          actorName={entries[0].actor_name}
          actorOrg={entries[0].actor_org}
          entries={entries}
          defaultExpanded={index < 3}
        />
      ))}
    </div>
  );
}

"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ActivityItem } from "./activity-item";
import type { ActivityEntry } from "./types";

const PAGE_SIZE = 50;

interface ActivityTimelineProps {
  selectedActorId: string | null;
}

function TimelineSkeleton() {
  return (
    <div className="space-y-2">
      {[0, 1, 2, 3, 4].map((i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
          <div className="h-8 w-8 rounded-full bg-bg-hover" />
          <div className="flex-1 space-y-1.5">
            <div className="h-4 w-48 rounded bg-bg-hover" />
            <div className="h-3 w-24 rounded bg-bg-elevated" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline({ selectedActorId }: ActivityTimelineProps) {
  const [activities, setActivities] = React.useState<ActivityEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [total, setTotal] = React.useState(0);
  const [page, setPage] = React.useState(0);

  // Reset page when filter changes
  React.useEffect(() => {
    setPage(0);
  }, [selectedActorId]);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: String(page * PAGE_SIZE),
        });
        if (selectedActorId) params.set("actor_id", selectedActorId);

        const res = await fetch(`/api/activity-log?${params}`);
        if (!res.ok) throw new Error("Failed to load activity.");
        const json = await res.json();
        if (!cancelled) {
          setActivities(json.activities ?? []);
          setTotal(json.total ?? 0);
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
  }, [page, selectedActorId]);

  if (error) {
    return (
      <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]" role="alert">
        {error}
      </div>
    );
  }

  if (loading) return <TimelineSkeleton />;

  if (activities.length === 0) {
    return (
      <EmptyState
        icon={Activity}
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
    <>
      <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
        {activities.map((entry) => (
          <ActivityItem key={entry.id} entry={entry} />
        ))}
      </div>

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-xs text-text-muted">
            Page {page + 1} of {Math.ceil(total / PAGE_SIZE)}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={(page + 1) * PAGE_SIZE >= total}
            className="inline-flex h-8 items-center rounded-md border border-border-default px-3 text-xs text-text-secondary hover:bg-bg-hover disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}

"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ActivityFilterBar } from "./activity-filter-bar";
import { ActivityTimeline } from "./activity-timeline";
import { ActivityGrouped } from "./activity-grouped";
import type { ActorSummary, ViewMode } from "./types";

export function ActivityClient() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const viewMode = (searchParams.get("view") === "grouped" ? "grouped" : "timeline") as ViewMode;
  const selectedActorId = searchParams.get("actor") || null;

  const [actors, setActors] = React.useState<ActorSummary[]>([]);

  // Fetch actors list for the filter dropdown
  React.useEffect(() => {
    async function loadActors() {
      try {
        const res = await fetch("/api/activity-log?actors=true");
        if (!res.ok) return;
        const json = await res.json();
        setActors(json.actors ?? []);
      } catch {
        // Non-critical — dropdown just stays empty
      }
    }
    loadActors();
  }, []);

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, val] of Object.entries(updates)) {
      if (val === null) {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    }
    const qs = params.toString();
    router.replace(`/portal/activity${qs ? `?${qs}` : ""}`, { scroll: false });
  }

  function handleViewModeChange(mode: ViewMode) {
    updateParams({ view: mode === "timeline" ? null : mode });
  }

  function handleActorChange(actorId: string | null) {
    updateParams({ actor: actorId });
  }

  return (
    <div className="space-y-4">
      <ActivityFilterBar
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        actors={actors}
        selectedActorId={selectedActorId}
        onActorChange={handleActorChange}
      />

      {viewMode === "timeline" ? (
        <ActivityTimeline selectedActorId={selectedActorId} />
      ) : (
        <ActivityGrouped selectedActorId={selectedActorId} />
      )}
    </div>
  );
}

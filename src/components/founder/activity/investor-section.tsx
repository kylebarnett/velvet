"use client";

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { ActivityItem } from "./activity-item";
import { formatRelativeTime } from "./activity-item";
import type { ActivityEntry } from "./types";

interface InvestorSectionProps {
  actorId: string;
  actorName: string;
  actorOrg: string | null;
  entries: ActivityEntry[];
  defaultExpanded?: boolean;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export function InvestorSection({
  actorId,
  actorName,
  actorOrg,
  entries,
  defaultExpanded = false,
}: InvestorSectionProps) {
  const [expanded, setExpanded] = React.useState(defaultExpanded);
  const regionId = `investor-section-${actorId}`;
  const lastActive = entries[0]?.created_at;

  return (
    <div className="rounded-xl border border-border-default card-surface overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={regionId}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-hover"
      >
        <ChevronRight
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform duration-150 ${expanded ? "rotate-90" : ""}`}
          aria-hidden="true"
        />

        {/* Initials avatar */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated text-xs font-medium text-text-secondary">
          {getInitials(actorName)}
        </div>

        <div className="min-w-0 flex-1">
          <span className="text-sm font-medium text-text-primary">
            {actorName}
            {actorOrg && (
              <span className="ml-1 font-normal text-text-tertiary">({actorOrg})</span>
            )}
          </span>
        </div>

        {/* Activity count badge */}
        <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-bg-elevated px-1.5 text-xs font-medium text-text-secondary">
          {entries.length}
        </span>

        {/* Last active */}
        {lastActive && (
          <span className="text-xs text-text-faint whitespace-nowrap">
            {formatRelativeTime(lastActive)}
          </span>
        )}
      </button>

      {expanded && (
        <div id={regionId} role="region" aria-label={`Activity for ${actorName}`} className="divide-y divide-border-subtle border-t border-border-subtle">
          {entries.map((entry) => (
            <ActivityItem key={entry.id} entry={entry} showActor={false} />
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { Activity, Eye, Download, FileText, BarChart3 } from "lucide-react";
import type { ActivityEntry } from "./types";

export const ACTION_CONFIG: Record<string, { icon: React.ElementType; label: string; color: string }> = {
  view_dashboard: { icon: Eye, label: "viewed your dashboard", color: "text-[var(--tag-blue-text)]" },
  download_document: { icon: Download, label: "downloaded a document", color: "text-[var(--tag-violet-text)]" },
  export_metrics: { icon: BarChart3, label: "exported metrics", color: "text-[var(--tag-emerald-text)]" },
  view_tear_sheet: { icon: FileText, label: "viewed a tear sheet", color: "text-[var(--tag-amber-text)]" },
};

export function formatRelativeTime(dateString: string): string {
  const now = new Date();
  const date = new Date(dateString);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface ActivityItemProps {
  entry: ActivityEntry;
  /** When false, omit actor name (used inside InvestorSection where name is in the header) */
  showActor?: boolean;
}

export function ActivityItem({ entry, showActor = true }: ActivityItemProps) {
  const config = ACTION_CONFIG[entry.action] ?? {
    icon: Activity,
    label: entry.action.replace(/_/g, " "),
    color: "text-text-tertiary",
  };
  const Icon = config.icon;
  const displayName = entry.actor_org
    ? `${entry.actor_name} (${entry.actor_org})`
    : entry.actor_name;

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">
          {showActor && (
            <>
              <span className="font-medium">{displayName}</span>{" "}
            </>
          )}
          <span className={showActor ? "text-text-tertiary" : ""}>{config.label}</span>
        </p>
        {(() => {
          const meta = entry.metadata;
          const detail =
            typeof meta?.document_name === "string"
              ? meta.document_name
              : typeof meta?.tear_sheet_title === "string"
                ? meta.tear_sheet_title
                : null;
          const count = typeof meta?.count === "number" && meta.count > 1
            ? `${meta.count} files`
            : null;
          const label = detail ?? count;
          if (!label) return null;
          return (
            <p className="mt-0.5 text-xs text-text-muted truncate">
              {label}
            </p>
          );
        })()}
        <p className="mt-0.5 text-xs text-text-faint">
          {formatRelativeTime(entry.created_at)}
        </p>
      </div>
    </div>
  );
}

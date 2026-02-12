"use client";

import { Clock, ArrowRight } from "lucide-react";
import { SourceBadge } from "./source-badge";

type HistoryEntry = {
  id: string;
  metric_value_id: string;
  previous_value: { raw?: string } | null;
  new_value: { raw?: string } | null;
  previous_source: string | null;
  new_source: string | null;
  changed_by: string | null;
  changed_by_name?: string | null;
  change_reason: string | null;
  created_at: string;
};

type Props = {
  history: HistoryEntry[];
};

function formatTimestamp(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MetricHistoryTimeline({ history }: Props) {
  if (history.length === 0) {
    return (
      <div className="flex items-center gap-3 py-8 text-sm text-text-faint">
        <Clock className="h-4 w-4 text-text-faint" />
        No change history
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {history.length > 1 && (
        <div className="absolute left-[9px] top-4 bottom-4 w-px bg-gradient-to-b from-[var(--info-border)] via-[var(--border-subtle)] to-transparent" />
      )}

      <div className="space-y-0">
        {history.map((entry, index) => {
          const prevVal =
            typeof entry.previous_value === "object" && entry.previous_value
              ? entry.previous_value.raw
              : String(entry.previous_value ?? "");
          const newVal =
            typeof entry.new_value === "object" && entry.new_value
              ? entry.new_value.raw
              : String(entry.new_value ?? "");

          const isFirst = index === 0;

          return (
            <div
              key={entry.id}
              className="relative flex gap-4 pb-6 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-1.5 flex h-5 w-5 shrink-0 items-center justify-center">
                <div
                  className={`rounded-full ${
                    isFirst
                      ? "h-2.5 w-2.5 bg-[var(--info-accent)] shadow-[0_0_10px_var(--info-glow)] ring-2 ring-[var(--info-border)]"
                      : "h-2 w-2 bg-bg-hover ring-1 ring-border-subtle"
                  }`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 rounded-xl border border-border-subtle bg-gradient-to-b from-bg-raised to-transparent p-4">
                <div className="flex items-center gap-2 text-[11px] text-text-muted">
                  <span className="tabular-nums">{formatTimestamp(entry.created_at)}</span>
                  {entry.changed_by_name && (
                    <>
                      <span className="h-0.5 w-0.5 rounded-full bg-text-faint" />
                      <span className="font-medium text-text-muted">{entry.changed_by_name}</span>
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2.5">
                  {prevVal && (
                    <span className="rounded-md bg-bg-raised px-2.5 py-1 font-mono text-xs tabular-nums text-text-muted">
                      {prevVal}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 shrink-0 text-text-faint" />
                  <span className="rounded-md bg-bg-hover px-2.5 py-1 font-mono text-xs tabular-nums text-text-primary ring-1 ring-inset ring-border-subtle">
                    {newVal}
                  </span>
                </div>

                {(entry.previous_source || entry.new_source) && (
                  <div className="mt-3 flex items-center gap-2.5">
                    {entry.previous_source && (
                      <SourceBadge source={entry.previous_source} />
                    )}
                    <ArrowRight className="h-3 w-3 shrink-0 text-text-faint" />
                    {entry.new_source && (
                      <SourceBadge source={entry.new_source} />
                    )}
                  </div>
                )}

                {entry.change_reason && (
                  <p className="mt-3 border-t border-border-subtle pt-3 text-xs leading-relaxed text-text-muted italic">
                    {entry.change_reason}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

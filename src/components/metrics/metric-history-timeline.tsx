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
      <div className="flex items-center gap-2 py-4 text-sm text-white/40">
        <Clock className="h-4 w-4" />
        No change history
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const prevVal =
          typeof entry.previous_value === "object" && entry.previous_value
            ? entry.previous_value.raw
            : String(entry.previous_value ?? "");
        const newVal =
          typeof entry.new_value === "object" && entry.new_value
            ? entry.new_value.raw
            : String(entry.new_value ?? "");

        return (
          <div
            key={entry.id}
            className="relative rounded-lg border border-white/5 bg-white/[0.03] p-3"
          >
            <div className="flex items-center gap-2 text-xs text-white/40">
              <Clock className="h-3 w-3" />
              <span>{formatTimestamp(entry.created_at)}</span>
              {entry.changed_by_name && (
                <>
                  <span className="text-white/20">|</span>
                  <span className="text-white/50">{entry.changed_by_name}</span>
                </>
              )}
            </div>

            <div className="mt-2 flex items-center gap-2">
              {prevVal && (
                <span className="rounded-md bg-white/5 px-2 py-0.5 font-mono text-sm text-white/50">
                  {prevVal}
                </span>
              )}
              <ArrowRight className="h-3 w-3 text-white/30" />
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-sm text-white">
                {newVal}
              </span>
            </div>

            {(entry.previous_source || entry.new_source) && (
              <div className="mt-2 flex items-center gap-2">
                {entry.previous_source && (
                  <SourceBadge source={entry.previous_source} />
                )}
                <ArrowRight className="h-3 w-3 text-white/30" />
                {entry.new_source && (
                  <SourceBadge source={entry.new_source} />
                )}
              </div>
            )}

            {entry.change_reason && (
              <p className="mt-2 text-xs text-white/50 italic">
                {entry.change_reason}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

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
      <div className="flex items-center gap-2.5 py-6 text-sm text-white/30">
        <Clock className="h-4 w-4" />
        No change history
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {history.length > 1 && (
        <div className="absolute left-[9px] top-4 bottom-4 w-px bg-gradient-to-b from-white/[0.08] via-white/[0.04] to-transparent" />
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
              className="relative flex gap-3.5 pb-5 last:pb-0"
            >
              {/* Timeline dot */}
              <div className="relative z-10 mt-1 flex h-[18px] w-[18px] shrink-0 items-center justify-center">
                <div
                  className={`h-2 w-2 rounded-full ${
                    isFirst
                      ? "bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.4)]"
                      : "bg-white/20"
                  }`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 rounded-lg border border-white/[0.04] bg-white/[0.02] p-3.5">
                <div className="flex items-center gap-2 text-[11px] text-white/35">
                  <span className="tabular-nums">{formatTimestamp(entry.created_at)}</span>
                  {entry.changed_by_name && (
                    <>
                      <span className="h-px w-2 bg-white/10" />
                      <span className="text-white/50">{entry.changed_by_name}</span>
                    </>
                  )}
                </div>

                <div className="mt-2.5 flex items-center gap-2">
                  {prevVal && (
                    <span className="rounded-md bg-white/[0.04] px-2 py-0.5 font-mono text-xs tabular-nums text-white/45">
                      {prevVal}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 shrink-0 text-white/20" />
                  <span className="rounded-md bg-white/[0.08] px-2 py-0.5 font-mono text-xs tabular-nums text-white/90">
                    {newVal}
                  </span>
                </div>

                {(entry.previous_source || entry.new_source) && (
                  <div className="mt-2.5 flex items-center gap-2">
                    {entry.previous_source && (
                      <SourceBadge source={entry.previous_source} />
                    )}
                    <ArrowRight className="h-3 w-3 shrink-0 text-white/20" />
                    {entry.new_source && (
                      <SourceBadge source={entry.new_source} />
                    )}
                  </div>
                )}

                {entry.change_reason && (
                  <p className="mt-2.5 border-t border-white/[0.04] pt-2.5 text-xs leading-relaxed text-white/40 italic">
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

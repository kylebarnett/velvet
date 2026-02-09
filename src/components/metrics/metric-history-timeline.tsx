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
      <div className="flex items-center gap-3 py-8 text-sm text-white/30">
        <Clock className="h-4 w-4 text-white/20" />
        No change history
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical connector line */}
      {history.length > 1 && (
        <div className="absolute left-[9px] top-4 bottom-4 w-px bg-gradient-to-b from-blue-400/15 via-white/[0.06] to-transparent" />
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
                      ? "h-2.5 w-2.5 bg-blue-400 shadow-[0_0_10px_rgba(59,130,246,0.5)] ring-2 ring-blue-400/15"
                      : "h-2 w-2 bg-white/15 ring-1 ring-white/[0.06]"
                  }`}
                />
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1 rounded-xl border border-white/[0.05] bg-gradient-to-b from-white/[0.03] to-white/[0.01] p-4">
                <div className="flex items-center gap-2 text-[11px] text-white/40">
                  <span className="tabular-nums">{formatTimestamp(entry.created_at)}</span>
                  {entry.changed_by_name && (
                    <>
                      <span className="h-0.5 w-0.5 rounded-full bg-white/20" />
                      <span className="font-medium text-white/55">{entry.changed_by_name}</span>
                    </>
                  )}
                </div>

                <div className="mt-3 flex items-center gap-2.5">
                  {prevVal && (
                    <span className="rounded-md bg-white/[0.04] px-2.5 py-1 font-mono text-xs tabular-nums text-white/40">
                      {prevVal}
                    </span>
                  )}
                  <ArrowRight className="h-3 w-3 shrink-0 text-white/25" />
                  <span className="rounded-md bg-white/[0.08] px-2.5 py-1 font-mono text-xs tabular-nums text-white ring-1 ring-inset ring-white/[0.06]">
                    {newVal}
                  </span>
                </div>

                {(entry.previous_source || entry.new_source) && (
                  <div className="mt-3 flex items-center gap-2.5">
                    {entry.previous_source && (
                      <SourceBadge source={entry.previous_source} />
                    )}
                    <ArrowRight className="h-3 w-3 shrink-0 text-white/25" />
                    {entry.new_source && (
                      <SourceBadge source={entry.new_source} />
                    )}
                  </div>
                )}

                {entry.change_reason && (
                  <p className="mt-3 border-t border-white/[0.04] pt-3 text-xs leading-relaxed text-white/45 italic">
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

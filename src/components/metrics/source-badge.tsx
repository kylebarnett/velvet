"use client";

import { Sparkles, PenLine, RotateCcw } from "lucide-react";

type Props = {
  source: string;
  confidence?: number | null;
  className?: string;
};

const sourceConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  manual: {
    label: "Manual",
    className: "bg-white/[0.06] text-white/60 ring-white/[0.08]",
    icon: PenLine,
  },
  ai_extracted: {
    label: "AI Extracted",
    className: "bg-violet-500/15 text-violet-200 ring-violet-500/20",
    icon: Sparkles,
  },
  override: {
    label: "Override",
    className: "bg-amber-500/15 text-amber-200 ring-amber-500/20",
    icon: RotateCcw,
  },
};

export function SourceBadge({ source, confidence, className }: Props) {
  const config = sourceConfig[source] ?? sourceConfig.manual;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide ring-1 ring-inset ${config.className} ${className ?? ""}`}
    >
      <Icon className="h-3 w-3 opacity-80" />
      {config.label}
      {source === "ai_extracted" && confidence != null && (
        <span className="ml-1 opacity-60 tabular-nums">
          ({(confidence * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}

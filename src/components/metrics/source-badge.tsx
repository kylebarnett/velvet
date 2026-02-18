"use client";

import { Sparkles, PenLine, RotateCcw, FileSpreadsheet, Layers } from "lucide-react";

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
    className: "bg-bg-elevated text-text-tertiary ring-border-subtle",
    icon: PenLine,
  },
  ai_extracted: {
    label: "AI Extracted",
    className: "bg-[var(--tag-violet-bg)] text-[var(--tag-violet-text)] ring-[var(--tag-violet-bg)]",
    icon: Sparkles,
  },
  override: {
    label: "Override",
    className: "bg-[var(--tag-amber-bg)] text-[var(--tag-amber-text)] ring-[var(--tag-amber-bg)]",
    icon: RotateCcw,
  },
  historical_upload: {
    label: "Historical Upload",
    className: "bg-[var(--tag-emerald-bg)] text-[var(--tag-emerald-text)] ring-[var(--tag-emerald-bg)]",
    icon: FileSpreadsheet,
  },
  rollup: {
    label: "Rolled Up",
    className: "bg-[var(--tag-blue-bg)] text-[var(--tag-blue-text)] ring-[var(--tag-blue-bg)]",
    icon: Layers,
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

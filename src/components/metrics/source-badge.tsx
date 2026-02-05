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
    className: "bg-white/10 text-white/60",
    icon: PenLine,
  },
  ai_extracted: {
    label: "AI Extracted",
    className: "bg-violet-500/20 text-violet-200",
    icon: Sparkles,
  },
  override: {
    label: "Override",
    className: "bg-amber-500/20 text-amber-200",
    icon: RotateCcw,
  },
};

export function SourceBadge({ source, confidence, className }: Props) {
  const config = sourceConfig[source] ?? sourceConfig.manual;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.className} ${className ?? ""}`}
    >
      <Icon className="h-3 w-3" />
      {config.label}
      {source === "ai_extracted" && confidence != null && (
        <span className="ml-0.5 opacity-70">
          ({(confidence * 100).toFixed(0)}%)
        </span>
      )}
    </span>
  );
}

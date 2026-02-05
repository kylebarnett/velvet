"use client";

import { Sparkles, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

type Props = {
  status: string;
  metricsCount?: number;
};

const statusConfig: Record<
  string,
  { label: string; className: string; icon: React.ElementType }
> = {
  pending: {
    label: "Ready to extract",
    className: "bg-white/10 text-white/60",
    icon: Clock,
  },
  processing: {
    label: "Extracting...",
    className: "bg-blue-500/20 text-blue-200",
    icon: Loader2,
  },
  completed: {
    label: "Extracted",
    className: "bg-emerald-500/20 text-emerald-200",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-red-500/20 text-red-200",
    icon: XCircle,
  },
};

export function ExtractionStatusBadge({ status, metricsCount }: Props) {
  const config = statusConfig[status] ?? statusConfig.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${config.className}`}
    >
      <Icon
        className={`h-3 w-3 ${status === "processing" ? "animate-spin" : ""}`}
      />
      <Sparkles className="h-2.5 w-2.5" />
      {config.label}
      {status === "completed" && metricsCount != null && metricsCount > 0 && (
        <span className="ml-0.5">({metricsCount})</span>
      )}
    </span>
  );
}

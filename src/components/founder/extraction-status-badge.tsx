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
    className: "bg-bg-hover text-text-tertiary",
    icon: Clock,
  },
  processing: {
    label: "Extracting...",
    className: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
    icon: Loader2,
  },
  completed: {
    label: "Extracted",
    className: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    className: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
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

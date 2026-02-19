"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  FileText,
  ShieldCheck,
  ShieldX,
  CheckCircle2,
  Activity,
} from "lucide-react";
import { formatRelativeTime } from "@/components/founder/activity/activity-item";

export type PortfolioEvent = {
  id: string;
  company_id: string;
  actor_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  company_name: string;
  actor_name: string | null;
};

const EVENT_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string }
> = {
  metric_submitted: {
    icon: BarChart3,
    color: "text-[var(--tag-emerald-text)]",
  },
  document_uploaded: {
    icon: FileText,
    color: "text-[var(--tag-blue-text)]",
  },
  access_approved: {
    icon: ShieldCheck,
    color: "text-[var(--tag-emerald-text)]",
  },
  access_denied: {
    icon: ShieldX,
    color: "text-[var(--tag-pink-text)]",
  },
  request_fulfilled: {
    icon: CheckCircle2,
    color: "text-[var(--tag-violet-text)]",
  },
};

function formatPeriodLabel(periodStart: string, periodType: string): string {
  const d = new Date(periodStart);
  const month = d.getUTCMonth();
  const year = d.getUTCFullYear();

  if (periodType === "quarterly") {
    const quarter = Math.floor(month / 3) + 1;
    return `Q${quarter} ${year}`;
  }
  if (periodType === "annual") {
    return `${year}`;
  }
  const monthName = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  return `${monthName} ${year}`;
}

function getEventDetail(event: PortfolioEvent): {
  action: string;
  detail: string | null;
} {
  const meta = event.metadata;
  const metricName = typeof meta?.metric_name === "string" ? meta.metric_name : null;
  const fileName = typeof meta?.file_name === "string" ? meta.file_name : null;
  const periodStart = typeof meta?.period_start === "string" ? meta.period_start : null;
  const periodType = typeof meta?.period_type === "string" ? meta.period_type : null;

  const periodLabel = periodStart && periodType ? formatPeriodLabel(periodStart, periodType) : null;

  switch (event.event_type) {
    case "metric_submitted": {
      const parts = [metricName, periodLabel].filter(Boolean);
      return {
        action: metricName ? `submitted ${metricName}` : "submitted a metric",
        detail: periodLabel ? `${periodLabel} \u00b7 ${periodType}` : null,
      };
    }
    case "document_uploaded":
      return {
        action: "uploaded a document",
        detail: fileName ?? event.description,
      };
    case "access_approved":
      return { action: "approved your access", detail: null };
    case "access_denied":
      return { action: "denied your access", detail: null };
    case "request_fulfilled":
      return {
        action: metricName
          ? `fulfilled ${metricName} request`
          : "fulfilled a metric request",
        detail: null,
      };
    default:
      return { action: event.event_type.replace(/_/g, " "), detail: null };
  }
}

/** Build a link to the relevant detail view based on event type. */
function getEventHref(event: PortfolioEvent): string | null {
  const meta = event.metadata;
  const base = `/companies/${event.company_id}`;

  switch (event.event_type) {
    case "metric_submitted":
    case "request_fulfilled": {
      const metricName = typeof meta?.metric_name === "string" ? meta.metric_name : null;
      const periodStart = typeof meta?.period_start === "string" ? meta.period_start : null;
      if (!metricName) return base;
      const params = new URLSearchParams({ metric: metricName });
      if (periodStart) params.set("period", periodStart);
      return `${base}?${params}`;
    }
    case "document_uploaded":
      return `${base}?tab=documents`;
    case "access_approved":
    case "access_denied":
      return base;
    default:
      return null;
  }
}

interface ActivityEventItemProps {
  event: PortfolioEvent;
}

export const ActivityEventItem = React.memo(function ActivityEventItem({
  event,
}: ActivityEventItemProps) {
  const config = EVENT_CONFIG[event.event_type] ?? {
    icon: Activity,
    color: "text-text-tertiary",
  };
  const Icon = config.icon;
  const { action, detail } = getEventDetail(event);
  const href = getEventHref(event);

  const content = (
    <div className="flex items-start gap-3 px-4 py-3">
      <div
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-elevated ${config.color}`}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-text-primary">
          <span className="font-medium">{event.company_name}</span>{" "}
          <span className="text-text-tertiary">{action}</span>
        </p>
        {detail && (
          <p className="mt-0.5 truncate text-xs text-text-muted">{detail}</p>
        )}
        <p className="mt-0.5 text-xs text-text-faint">
          {formatRelativeTime(event.created_at)}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block transition-colors hover:bg-bg-elevated/50"
      >
        {content}
      </Link>
    );
  }

  return content;
});

"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus, AlertCircle } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type MetricSnapshot = {
  name: string;
  value: number | null;
  previousValue: number | null;
  percentChange: number | null;
  periodLabel: string | null;
};

type CompanyCardProps = {
  id: string;
  name: string;
  stage: string | null;
  industry: string | null;
  logoUrl: string | null;
  founderId: string | null;
  approvalStatus: string;
  latestMetric?: MetricSnapshot | null;
  secondaryMetric?: MetricSnapshot | null;
  lastSubmittedAt?: string | null;
};

function formatFreshness(dateStr: string): { label: string; isStale: boolean } {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { label: "Updated today", isStale: false };
  if (diffDays === 1) return { label: "Updated yesterday", isStale: false };
  if (diffDays < 7) return { label: `Updated ${diffDays}d ago`, isStale: false };
  if (diffDays < 30) return { label: `Updated ${Math.floor(diffDays / 7)}w ago`, isStale: false };
  if (diffDays < 90) return { label: `Updated ${Math.floor(diffDays / 30)}mo ago`, isStale: false };
  return { label: "Stale", isStale: true };
}

function formatValue(value: number | null, metricName?: string): string {
  if (value == null) return "-";

  const lowerName = metricName?.toLowerCase() ?? "";

  // Currency metrics (check before percentage — "Burn Rate" is currency, not %)
  if (
    lowerName.includes("revenue") ||
    lowerName.includes("mrr") ||
    lowerName.includes("arr") ||
    lowerName.includes("burn") ||
    lowerName.includes("cost") ||
    lowerName.includes("gmv")
  ) {
    if (Math.abs(value) >= 1_000_000) {
      return `$${(value / 1_000_000).toFixed(1)}M`;
    }
    if (Math.abs(value) >= 1_000) {
      return `$${(value / 1_000).toFixed(0)}K`;
    }
    return `$${value.toFixed(0)}`;
  }

  // Percentage metrics
  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn")
  ) {
    return `${value.toFixed(1)}%`;
  }

  // Large numbers
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${(value / 1_000).toFixed(1)}K`;
  }

  return value.toFixed(value % 1 === 0 ? 0 : 1);
}

function CompanyLogoDisplay({
  name,
  logoUrl,
}: {
  name: string;
  logoUrl: string | null;
}) {
  const [imgError, setImgError] = React.useState(false);
  const displayUrl = getCompanyLogoUrl(logoUrl);
  const initial = name.charAt(0).toUpperCase();

  return (
    <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-border-subtle bg-bg-elevated">
      {displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-lg font-medium text-text-tertiary">{initial}</span>
      )}
    </div>
  );
}

function TrendIndicator({ percentChange }: { percentChange: number | null }) {
  if (percentChange == null) {
    return <Minus className="h-4 w-4 text-text-muted" aria-hidden="true" />;
  }

  if (percentChange > 0) {
    return (
      <div className="flex items-center gap-1 text-[var(--success-accent)]" role="status">
        <TrendingUp className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium">+{percentChange.toFixed(0)}%</span>
        <span className="sr-only">Trending up {percentChange.toFixed(0)} percent</span>
      </div>
    );
  }

  if (percentChange < 0) {
    return (
      <div className="flex items-center gap-1 text-[var(--error-accent)]" role="status">
        <TrendingDown className="h-4 w-4" aria-hidden="true" />
        <span className="text-xs font-medium">{percentChange.toFixed(0)}%</span>
        <span className="sr-only">Trending down {Math.abs(percentChange).toFixed(0)} percent</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-text-muted" role="status">
      <Minus className="h-4 w-4" aria-hidden="true" />
      <span className="text-xs font-medium">0%</span>
      <span className="sr-only">No change</span>
    </div>
  );
}

export function CompanyCard({
  id,
  name,
  stage,
  industry,
  logoUrl,
  founderId,
  approvalStatus,
  latestMetric,
  secondaryMetric,
  lastSubmittedAt,
}: CompanyCardProps) {
  const isApproved = ["auto_approved", "approved"].includes(approvalStatus);
  const hasFounder = !!founderId;
  const hasAnyMetric = latestMetric && latestMetric.value != null;

  return (
    <Link
      href={`/dashboard/${id}`}
      className="card-hover-lift flex flex-col rounded-xl border border-border-subtle card-surface p-5 hover:border-border-default"
    >
      <div className="flex items-start justify-between">
        <CompanyLogoDisplay name={name} logoUrl={logoUrl} />
        {!isApproved && approvalStatus === "pending" && (
          <span className="rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs text-[var(--status-warning-text)]" title="Awaiting founder approval — they need to approve access before you can see their metrics">
            Pending approval
          </span>
        )}
        {!isApproved && approvalStatus === "denied" && (
          <span className="rounded-full bg-[var(--status-error-bg)] px-2 py-0.5 text-xs text-[var(--status-error-text)]" title="The founder has denied access to their metrics">
            Access denied
          </span>
        )}
      </div>

      <div className="mt-3 mb-2">
        <h3 className="font-medium text-text-primary">{name}</h3>
        <div className="mt-1.5 flex items-center gap-1.5">
          {industry && <span className="rounded-full bg-[var(--tag-blue-bg)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--tag-blue-text)]">{industry.replace(/_/g, " ")}</span>}
          {stage && <span className="rounded-full bg-[var(--tag-violet-bg)] px-2.5 py-0.5 text-[11px] font-medium capitalize text-[var(--tag-violet-text)]">{stage.replace(/_/g, " ")}</span>}
        </div>
      </div>

      {hasAnyMetric && (
        <div className="mt-auto space-y-2 border-t border-border-subtle pt-4">
          {/* Primary metric */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-tertiary">
                {latestMetric.name}
                {latestMetric.periodLabel && (
                  <span className="ml-1 text-text-faint">· {latestMetric.periodLabel}</span>
                )}
              </div>
              <div className="mt-0.5 text-lg font-semibold">
                {formatValue(latestMetric.value, latestMetric.name)}
              </div>
            </div>
            <TrendIndicator percentChange={latestMetric.percentChange} />
          </div>

          {/* Secondary metric (smaller) */}
          {secondaryMetric && secondaryMetric.value != null && (
            <div className="flex items-center justify-between border-t border-border-subtle pt-2">
              <div>
                <div className="text-xs text-text-muted">
                  {secondaryMetric.name}
                  {secondaryMetric.periodLabel && (
                    <span className="ml-1 text-text-faint">· {secondaryMetric.periodLabel}</span>
                  )}
                </div>
                <div className="mt-0.5 text-sm font-medium text-text-primary">
                  {formatValue(secondaryMetric.value, secondaryMetric.name)}
                </div>
              </div>
              <TrendIndicator percentChange={secondaryMetric.percentChange} />
            </div>
          )}
        </div>
      )}

      {hasAnyMetric && lastSubmittedAt && (
        <div className="mt-1 flex items-center gap-1">
          {(() => {
            const { label, isStale } = formatFreshness(lastSubmittedAt);
            return isStale ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--tag-amber-bg)] px-2 py-0.5 text-[10px] text-[var(--tag-amber-text)]">
                <AlertCircle className="h-3 w-3" />
                {label}
              </span>
            ) : (
              <span className="text-[10px] text-text-faint">{label}</span>
            );
          })()}
        </div>
      )}

      {!hasAnyMetric && hasFounder && isApproved && (
        <div className="mt-auto border-t border-border-subtle pt-4">
          <span className="text-xs text-text-muted">No metrics submitted yet</span>
          <span
            className="mt-1 block text-xs text-text-tertiary hover:text-text-secondary"
            onClick={(e) => e.stopPropagation()}
          >
            <Link href="/historical-upload" className="underline underline-offset-2">
              Import historical data
            </Link>
          </span>
        </div>
      )}

      {!hasFounder && (
        <div className="mt-auto flex items-center border-t border-border-subtle pt-4">
          <span className="text-xs text-[var(--status-warning-text)]/60">Awaiting founder signup</span>
        </div>
      )}
    </Link>
  );
}

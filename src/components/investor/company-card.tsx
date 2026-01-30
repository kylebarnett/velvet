"use client";

import * as React from "react";
import Link from "next/link";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { getCompanyLogoUrl } from "@/lib/utils/logo";

type MetricSnapshot = {
  name: string;
  value: number | null;
  previousValue: number | null;
  percentChange: number | null;
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
};

function formatValue(value: number | null, metricName?: string): string {
  if (value == null) return "-";

  const lowerName = metricName?.toLowerCase() ?? "";

  // Percentage metrics
  if (
    lowerName.includes("rate") ||
    lowerName.includes("margin") ||
    lowerName.includes("retention") ||
    lowerName.includes("churn")
  ) {
    return `${value.toFixed(1)}%`;
  }

  // Currency/revenue metrics
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
    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg border border-white/10 bg-white/5">
      {displayUrl && !imgError ? (
        <img
          src={displayUrl}
          alt={name}
          className="h-full w-full object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="text-lg font-medium text-white/60">{initial}</span>
      )}
    </div>
  );
}

function TrendIndicator({ percentChange }: { percentChange: number | null }) {
  if (percentChange == null) {
    return <Minus className="h-4 w-4 text-white/40" />;
  }

  if (percentChange > 0) {
    return (
      <div className="flex items-center gap-1 text-emerald-400">
        <TrendingUp className="h-4 w-4" />
        <span className="text-xs font-medium">+{percentChange.toFixed(0)}%</span>
      </div>
    );
  }

  if (percentChange < 0) {
    return (
      <div className="flex items-center gap-1 text-red-400">
        <TrendingDown className="h-4 w-4" />
        <span className="text-xs font-medium">{percentChange.toFixed(0)}%</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-white/40">
      <Minus className="h-4 w-4" />
      <span className="text-xs font-medium">0%</span>
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
}: CompanyCardProps) {
  const isApproved = ["auto_approved", "approved"].includes(approvalStatus);
  const hasFounder = !!founderId;

  return (
    <Link
      href={`/dashboard/${id}`}
      className="flex flex-col rounded-xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/20 hover:bg-white/[0.07]"
    >
      <div className="flex items-start justify-between">
        <CompanyLogoDisplay name={name} logoUrl={logoUrl} />
        {!isApproved && (
          <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200">
            Pending
          </span>
        )}
      </div>

      <div className="mt-3">
        <h3 className="font-medium text-white">{name}</h3>
        <div className="mt-1 flex items-center gap-2 text-xs text-white/50">
          {industry && <span className="capitalize">{industry.replace(/_/g, " ")}</span>}
          {industry && stage && <span>-</span>}
          {stage && <span className="capitalize">{stage.replace(/_/g, " ")}</span>}
        </div>
      </div>

      {latestMetric && latestMetric.value != null && (
        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <div>
            <div className="text-xs text-white/50">{latestMetric.name}</div>
            <div className="mt-0.5 text-lg font-semibold">
              {formatValue(latestMetric.value, latestMetric.name)}
            </div>
          </div>
          <TrendIndicator percentChange={latestMetric.percentChange} />
        </div>
      )}

      {!latestMetric && hasFounder && isApproved && (
        <div className="mt-4 flex items-center border-t border-white/10 pt-3">
          <span className="text-xs text-white/40">No metrics submitted yet</span>
        </div>
      )}

      {!hasFounder && (
        <div className="mt-4 flex items-center border-t border-white/10 pt-3">
          <span className="text-xs text-amber-200/60">Awaiting founder signup</span>
        </div>
      )}
    </Link>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type FundCardProps = {
  fund: {
    id: string;
    name: string;
    vintage_year: number;
    fund_size: number | null;
    currency: string;
  };
};

type Performance = {
  tvpi: number | null;
  dpi: number | null;
  moic: number | null;
  investmentCount: number;
};

function formatCurrency(value: number | null, currency: string): string {
  if (value == null) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatMultiple(value: number | null): string {
  if (value == null) return "-";
  return `${value.toFixed(2)}x`;
}

export function FundCard({ fund }: FundCardProps) {
  const [performance, setPerformance] = useState<Performance | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/investors/funds/${fund.id}/performance`);
        if (res.ok) {
          const data = await res.json();
          setPerformance(data);
        }
      } catch {
        // Silently fail — card still shows fund info
      }
    }
    load();
  }, [fund.id]);

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-5 transition-colors hover:bg-white/[0.07]">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-medium text-zinc-50">{fund.name}</h3>
          <p className="mt-0.5 text-xs text-white/60">
            Vintage {fund.vintage_year}
            {fund.fund_size != null && (
              <> &middot; {formatCurrency(fund.fund_size, fund.currency)}</>
            )}
          </p>
        </div>
        {performance && (
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/60">
            {performance.investmentCount} investment{performance.investmentCount !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* KPI row */}
      <div className="mt-4 flex gap-4">
        <KpiMini label="TVPI" value={formatMultiple(performance?.tvpi ?? null)} good={performance?.tvpi != null && performance.tvpi >= 1} />
        <KpiMini label="DPI" value={formatMultiple(performance?.dpi ?? null)} good={performance?.dpi != null && performance.dpi >= 1} />
        <KpiMini label="MOIC" value={formatMultiple(performance?.moic ?? null)} good={performance?.moic != null && performance.moic >= 1} />
      </div>

      <Link
        href={`/lp-reports/${fund.id}`}
        className="mt-4 flex h-9 items-center justify-center gap-1.5 rounded-md border border-white/10 bg-white/5 text-sm text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        View Details
        <ArrowRight className="h-3.5 w-3.5" />
      </Link>
    </div>
  );
}

function KpiMini({
  label,
  value,
  good,
}: {
  label: string;
  value: string;
  good: boolean;
}) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] uppercase tracking-wider text-white/40">{label}</p>
      <p
        className={cn(
          "mt-0.5 text-lg font-semibold",
          value === "-" ? "text-white/30" : good ? "text-emerald-400" : "text-amber-400",
        )}
      >
        {value}
      </p>
    </div>
  );
}

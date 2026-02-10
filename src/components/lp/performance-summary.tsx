"use client";

import { cn } from "@/lib/utils/cn";

type PerformanceSummaryProps = {
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  irr: number | null;
  moic: number | null;
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
  currency: string;
};

function formatMultiple(value: number | null): string {
  if (value == null) return "-";
  return `${value.toFixed(2)}x`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "-";
  return `${(value * 100).toFixed(1)}%`;
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getMultipleColor(value: number | null): string {
  if (value == null) return "text-text-faint";
  if (value >= 2) return "text-emerald-400";
  if (value >= 1) return "text-emerald-400/80";
  if (value >= 0.5) return "text-amber-400";
  return "text-red-400";
}

function getIRRColor(value: number | null): string {
  if (value == null) return "text-text-faint";
  if (value >= 0.25) return "text-emerald-400";
  if (value >= 0.1) return "text-emerald-400/80";
  if (value >= 0) return "text-amber-400";
  return "text-red-400";
}

export function PerformanceSummary({
  tvpi,
  dpi,
  rvpi,
  irr,
  moic,
  totalInvested,
  totalCurrentValue,
  totalRealizedValue,
  currency,
}: PerformanceSummaryProps) {
  const kpis = [
    {
      label: "TVPI",
      value: formatMultiple(tvpi),
      color: getMultipleColor(tvpi),
      tooltip: "Total Value to Paid-In",
      formula: "(Unrealized + Realized) / Invested",
    },
    {
      label: "DPI",
      value: formatMultiple(dpi),
      color: getMultipleColor(dpi),
      tooltip: "Distributions to Paid-In",
      formula: "Realized / Invested",
    },
    {
      label: "RVPI",
      value: formatMultiple(rvpi),
      color: getMultipleColor(rvpi),
      tooltip: "Residual Value to Paid-In",
      formula: "Unrealized / Invested",
    },
    {
      label: "IRR",
      value: formatPercent(irr),
      color: getIRRColor(irr),
      tooltip: "Internal Rate of Return",
      formula: "Newton-Raphson on dated cash flows",
    },
    {
      label: "MOIC",
      value: formatMultiple(moic),
      color: getMultipleColor(moic),
      tooltip: "Multiple on Invested Capital",
      formula: "(Unrealized + Realized) / Invested",
    },
  ];

  return (
    <div className="space-y-4">
      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <div
            key={kpi.label}
            className="group relative rounded-xl border border-border-default bg-bg-elevated p-4"
          >
            <p className="text-[10px] uppercase tracking-wider text-text-muted">{kpi.label}</p>
            <p className={cn("mt-1 text-2xl font-semibold", kpi.color)}>
              {kpi.value}
            </p>
            {/* Hover tooltip */}
            <div
              className="pointer-events-none invisible absolute bottom-full left-1/2 z-50 mb-2 w-56 -translate-x-1/2 rounded-lg px-3 py-2.5 shadow-xl group-hover:visible"
              style={{ backgroundColor: "#1c1c20", border: "1px solid rgba(255,255,255,0.12)" }}
            >
              <p className="text-xs font-medium text-white">{kpi.tooltip}</p>
              <p className="mt-1 font-mono text-[11px] text-white/50">{kpi.formula}</p>
              {/* Arrow */}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent" style={{ borderTopColor: "#1c1c20" }} />
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="flex flex-wrap gap-6 rounded-lg border border-border-subtle bg-bg-raised px-4 py-3">
        <SummaryItem label="Total Invested" value={formatCurrency(totalInvested, currency)} />
        <SummaryItem label="Current Value" value={formatCurrency(totalCurrentValue, currency)} />
        <SummaryItem label="Realized" value={formatCurrency(totalRealizedValue, currency)} />
        <SummaryItem
          label="Total Value"
          value={formatCurrency(totalCurrentValue + totalRealizedValue, currency)}
        />
      </div>
    </div>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

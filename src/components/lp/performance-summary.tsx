"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  if (value >= 2) return "text-[var(--success-accent)]";
  if (value >= 1) return "text-[var(--success-accent)]/80";
  if (value >= 0.5) return "text-[var(--warning-accent)]";
  return "text-[var(--error-accent)]";
}

function getIRRColor(value: number | null): string {
  if (value == null) return "text-text-faint";
  if (value >= 0.25) return "text-[var(--success-accent)]";
  if (value >= 0.1) return "text-[var(--success-accent)]/80";
  if (value >= 0) return "text-[var(--warning-accent)]";
  return "text-[var(--error-accent)]";
}

function KpiTooltip({
  tooltip,
  formula,
  children,
}: {
  tooltip: string;
  formula: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [visible, setVisible] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);

  function show() {
    if (!ref.current) return;
    setRect(ref.current.getBoundingClientRect());
    setVisible(true);
  }

  function hide() {
    setVisible(false);
  }

  return (
    <>
      <span ref={ref} onMouseEnter={show} onMouseLeave={hide} className="inline-block">
        {children}
      </span>
      {visible && rect && createPortal(
        <div
          style={{
            position: "fixed",
            zIndex: 99999,
            bottom: window.innerHeight - rect.top + 8,
            left: rect.left,
            width: 220,
            padding: "10px 12px",
            borderRadius: 8,
            backgroundColor: "var(--card-bg)",
            border: "1px solid var(--border-default)",
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <p className="text-xs font-medium text-text-primary">{tooltip}</p>
          <p className="mt-1 font-mono text-[11px] text-text-muted">{formula}</p>
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "100%",
              borderWidth: 6,
              borderStyle: "solid",
              borderColor: "var(--card-bg) transparent transparent transparent",
            }}
          />
        </div>,
        document.body,
      )}
    </>
  );
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
      tooltip: "Annualized return accounting for timing of capital calls and distributions",
      formula: "Time-weighted rate that sets NPV of cash flows to zero",
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
          <div key={kpi.label} className="rounded-xl border border-border-default card-surface p-4">
            <KpiTooltip tooltip={kpi.tooltip} formula={kpi.formula}>
              <p className="inline-flex cursor-help text-xs uppercase tracking-wide text-text-muted border-b border-dashed border-text-muted/30">
                {kpi.label}
              </p>
            </KpiTooltip>
            <p className={cn("mt-1 text-2xl font-bold", kpi.color)}>
              {kpi.value}
            </p>
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
      <p className="text-xs uppercase tracking-wide text-text-muted">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-text-primary">{value}</p>
    </div>
  );
}

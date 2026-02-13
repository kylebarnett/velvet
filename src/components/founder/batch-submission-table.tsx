"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info, Star, TrendingDown } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { MetricDetailPanel } from "@/components/metrics/metric-detail-panel";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import { getMetricDefinition, inferMetricValueType } from "@/lib/metric-definitions";
import {
  type RawMetric,
  type ReportCard,
  getSparklineValues,
  getPreviousValue,
  computeDelta,
  detectAnomaly,
  buildReportCard,
  formatReportValue,
} from "@/lib/metrics/batch-analytics";
import {
  type Period,
  generateMonthlyPeriods,
  generateQuarterlyPeriods,
  generateAnnualPeriods,
} from "@/lib/utils/period-generator";

type PeriodTypeValue = "quarterly" | "annual";

const PERIOD_TYPE_TABS: TabItem<PeriodTypeValue>[] = [
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];

type GroupedRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  investorCount: number;
  investorNames: string[];
  requestIds: string[];
  hasSubmission: boolean;
};

type BatchSubmissionTableProps = {
  initialCompanyId: string | null;
  prefilterPeriod: {
    periodType: string;
    periodStart: string;
    periodEnd: string;
  } | null;
  onBack: () => void;
};

/** Return a placeholder hint appropriate for the metric type. */
function getFormatHint(metricName: string): string {
  const lower = metricName.toLowerCase();
  // Currency metrics (check before percentage — "Burn Rate" is currency, not %)
  if (
    /revenue|mrr|arr|burn|cost|expense|spend|salary|cogs|gmv|aov|arpu|ltv|cac|cash|invested|valuation/.test(
      lower,
    )
  ) {
    return "e.g. 50000";
  }
  // Percentage / rate metrics
  if (
    /rate|margin|retention|churn|conversion|ratio|nrr|grr|nps|score|percent|utilization/.test(
      lower,
    )
  ) {
    return "e.g. 45.2";
  }
  return "e.g. 1000";
}

function formatPriorValue(metricName: string, rawValue: string): string {
  const num = parseFloat(rawValue);
  if (isNaN(num)) return rawValue;

  const valueType = inferMetricValueType(metricName);
  if (valueType === "currency") {
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `$${Math.round(num / 1_000)}K`;
    return `$${num.toFixed(0)}`;
  }
  if (valueType === "percent") return `${num.toFixed(1)}%`;
  if (valueType === "ratio") return num.toFixed(2);
  return num.toLocaleString();
}

function MetricInfoTooltip({ metricName }: { metricName: string }) {
  const [show, setShow] = React.useState(false);
  const info = getMetricDefinition(metricName);
  if (!info) return null;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        className="mt-0.5 text-text-faint hover:text-text-tertiary transition-colors"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => { e.stopPropagation(); setShow(!show); }}
        aria-label={`Info about ${metricName}`}
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {show && (
        <div className="absolute bottom-full left-0 z-50 mb-2 w-64 rounded-lg border border-border-default bg-bg-secondary p-3 shadow-xl">
          <p className="text-xs font-medium text-text-primary">{metricName}</p>
          <p className="mt-1 text-xs text-text-tertiary">{info.description}</p>
          {info.formula && (
            <div className="mt-2 rounded bg-bg-elevated px-2 py-1.5">
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">Formula</p>
              <p className="mt-0.5 text-xs text-[var(--success-accent)]">{info.formula}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-32 animate-pulse rounded bg-bg-hover" />
        <div className="h-8 w-40 animate-pulse rounded-lg bg-bg-hover" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border-default">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default bg-bg-elevated">
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-16 animate-pulse rounded bg-bg-hover" />
              </th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} className="px-3 py-3 text-center">
                  <div className="mx-auto h-4 w-14 animate-pulse rounded bg-bg-hover" />
                </th>
              ))}
              <th className="px-3 py-3">
                <div className="h-4 w-12 animate-pulse rounded bg-bg-hover" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r} className="border-b border-border-subtle">
                <td className="px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-bg-hover" />
                </td>
                {[0, 1, 2, 3].map((c) => (
                  <td key={c} className="px-2 py-3">
                    <div className="mx-auto h-9 w-full animate-pulse rounded-md bg-bg-elevated" />
                  </td>
                ))}
                <td className="px-2 py-3">
                  <div className="h-9 w-full animate-pulse rounded-md bg-bg-elevated" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Virtualization threshold — only virtualize when row count exceeds this */
const BATCH_VIRTUALIZE_THRESHOLD = 30;
/** Estimated row height in pixels for the virtualizer */
const BATCH_ESTIMATED_ROW_HEIGHT = 52;

type BatchRow = {
  metricName: string;
  investorNames: string[];
  investorCount: number;
  requestIds: string[];
  values: Record<string, string>;
  notes: string;
};

type BatchTableBodyProps = {
  requestedRows: BatchRow[];
  otherRows: BatchRow[];
  periods: Period[];
  existingValues: Record<string, Record<string, string>>;
  cellErrors: Map<string, string>;
  updateCellValue: (metricName: string, periodKey: string, value: string) => void;
  updateNotes: (metricName: string, notes: string) => void;
  setDetailMetric: React.Dispatch<React.SetStateAction<string | null>>;
  rawMetrics: RawMetric[];
  periodType: string;
};

function BatchTableBody({
  requestedRows,
  otherRows,
  periods,
  existingValues,
  cellErrors,
  updateCellValue,
  updateNotes,
  setDetailMetric,
  rawMetrics,
  periodType,
}: BatchTableBodyProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const allRows = React.useMemo(
    () => [...requestedRows, ...otherRows],
    [requestedRows, otherRows],
  );
  const shouldVirtualize = allRows.length > BATCH_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: allRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => BATCH_ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Column count: metric + periods + notes
  const colCount = 1 + periods.length + 1;

  // Current period start for delta/anomaly lookups
  const currentPeriodStart = periods[0]?.start ?? "";

  const renderRow = (row: BatchRow, muted: boolean) => (
    <>
      <td className="sticky left-0 z-10 bg-bg-primary px-4 py-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-start gap-1.5">
              <button
                type="button"
                onClick={() => setDetailMetric(row.metricName)}
                className={`font-medium hover:underline underline-offset-2 text-left ${
                  muted ? "text-text-secondary" : "text-text-primary"
                }`}
              >
                {row.metricName}
              </button>
              <MetricInfoTooltip metricName={row.metricName} />
            </div>
            {row.investorNames.length > 0 && (
              <div className="text-[10px] text-text-muted">
                {row.investorNames.join(", ")}
              </div>
            )}
          </div>
        </div>
      </td>
      {periods.map((p) => {
        const existing = existingValues[row.metricName]?.[p.key];
        const hasExisting = !!existing;
        const cellKey = `${row.metricName}:${p.key}`;
        const cellError = cellErrors.get(cellKey);
        const userEnteredValue = row.values[p.key]?.trim() || "";
        // Previous value from raw metrics history
        const prevValue = getPreviousValue(
          rawMetrics,
          row.metricName,
          periodType,
          p.start,
        );
        return (
          <td
            key={p.key}
            className={`px-2 py-2 ${p.isRequested ? "bg-bg-hover" : ""}`}
          >
            <div className="relative">
              <input
                type="text"
                value={row.values[p.key] ?? ""}
                onChange={(e) =>
                  updateCellValue(row.metricName, p.key, e.target.value)
                }
                placeholder={hasExisting ? existing : getFormatHint(row.metricName)}
                className={`h-9 w-full rounded-md border bg-bg-input px-2 text-center text-sm font-mono focus:outline-none focus:ring-2 ${
                  cellError
                    ? "border-[var(--error-border)] focus:border-[var(--error-accent)] focus:ring-[var(--error-ring)]"
                    : hasExisting && !row.values[p.key]
                      ? "border-border-subtle text-text-muted focus:border-border-default focus:ring-[var(--ring-focus)]"
                      : "border-border-default text-text-primary focus:border-border-default focus:ring-[var(--ring-focus)]"
                }`}
              />
              {cellError && (
                <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--bg-tooltip)] px-2 py-0.5 text-[10px] text-[var(--status-error-text)]">
                  {cellError}
                </div>
              )}
              {/* Live delta indicator */}
              {userEnteredValue && prevValue !== null && (() => {
                const num = parseFloat(userEnteredValue);
                if (isNaN(num)) return null;
                if (prevValue === 0) return null;
                const delta = computeDelta(num, prevValue);
                if (delta.percent === null) return null;
                return (
                  <div className={`mt-0.5 text-center text-[10px] font-medium ${
                    delta.direction === "up" ? "text-[var(--data-positive)]"
                    : delta.direction === "down" ? "text-[var(--data-negative)]"
                    : "text-text-muted"
                  }`}>
                    {delta.direction === "up" ? "\u2191" : delta.direction === "down" ? "\u2193" : "\u2192"}{" "}
                    {Math.abs(delta.percent).toFixed(1)}% from prior
                  </div>
                );
              })()}
              {/* Anomaly warning */}
              {userEnteredValue && (() => {
                const num = parseFloat(userEnteredValue);
                if (isNaN(num)) return null;
                const historical = getSparklineValues(rawMetrics, row.metricName, periodType);
                const anomaly = detectAnomaly(num, historical);
                if (!anomaly.isAnomaly) return null;
                return (
                  <div className="mt-0.5 flex items-center justify-center gap-1 text-[10px] text-[var(--warning-accent)]">
                    <AlertTriangle className="h-2.5 w-2.5" />
                    {anomaly.message}
                  </div>
                );
              })()}
              {/* Prior value hint (only when no existing and no user value) */}
              {!hasExisting && !userEnteredValue && prevValue !== null && (
                <div className="mt-0.5 text-center text-[10px] text-text-faint">
                  Prior: {formatPriorValue(row.metricName, String(prevValue))}
                </div>
              )}
            </div>
          </td>
        );
      })}
      <td className="px-2 py-2">
        <input
          type="text"
          value={row.notes}
          onChange={(e) => updateNotes(row.metricName, e.target.value)}
          placeholder="Optional notes..."
          className="h-9 w-full rounded-md border border-border-default bg-bg-input px-2 text-sm placeholder:text-text-faint focus:border-border-default focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
        />
      </td>
    </>
  );

  const theadContent = (
    <tr className="border-b border-border-default bg-bg-elevated">
      <th className="sticky left-0 z-10 bg-bg-elevated px-4 py-3 text-left font-medium text-text-secondary">
        Metric
      </th>
      {periods.map((p) => (
        <th
          key={p.key}
          className={`px-3 py-3 text-center font-medium text-text-secondary min-w-[120px] ${
            p.isRequested ? "bg-bg-hover" : ""
          }`}
        >
          {p.label}
        </th>
      ))}
      <th className="px-3 py-3 text-left font-medium text-text-secondary min-w-[160px]">
        Notes
      </th>
    </tr>
  );

  // Section header row
  const sectionHeader = (label: string, subtitle?: string) => (
    <tr className="border-b border-border-subtle">
      <td colSpan={colCount} className="px-4 py-2 bg-bg-primary">
        <span className="text-xs font-medium uppercase tracking-wide text-text-muted">
          {label}
        </span>
        {subtitle && (
          <span className="ml-2 text-xs text-text-faint">{subtitle}</span>
        )}
      </td>
    </tr>
  );

  if (!shouldVirtualize) {
    return (
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm">
          <thead>{theadContent}</thead>
          <tbody>
            {requestedRows.length > 0 && otherRows.length > 0 && sectionHeader("Requested by investors")}
            {requestedRows.map((row) => (
              <tr key={row.metricName} className="border-b border-border-subtle">
                {renderRow(row, false)}
              </tr>
            ))}
            {otherRows.length > 0 && (
              <>
                {sectionHeader("Other metrics", "Not requested, but you can submit them now")}
                {otherRows.map((row) => (
                  <tr key={row.metricName} className="border-b border-border-subtle">
                    {renderRow(row, true)}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    );
  }

  // Virtualized rendering — flat list with section awareness
  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div
      ref={parentRef}
      className="max-h-[600px] overflow-auto rounded-xl border border-border-default"
    >
      <table className="w-full text-sm">
        <thead className="sticky top-0 z-20 bg-bg-elevated">
          {theadContent}
        </thead>
        <tbody>
          {/* Top spacer */}
          {virtualItems.length > 0 && virtualItems[0].start > 0 && (
            <tr>
              <td
                colSpan={colCount}
                style={{ height: virtualItems[0].start, padding: 0, border: 0 }}
              />
            </tr>
          )}
          {virtualItems.map((virtualRow) => {
            const row = allRows[virtualRow.index];
            const isOther = virtualRow.index >= requestedRows.length;
            return (
              <tr
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="border-b border-border-subtle"
              >
                {renderRow(row, isOther)}
              </tr>
            );
          })}
          {/* Bottom spacer */}
          {virtualItems.length > 0 && (
            <tr>
              <td
                colSpan={colCount}
                style={{
                  height: virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0),
                  padding: 0,
                  border: 0,
                }}
              />
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ReportCardView({
  card,
  periodType,
  periodStart,
  onBack,
}: {
  card: ReportCard;
  periodType: string;
  periodStart: string;
  onBack: () => void;
}) {
  // Build period label
  let periodLabel = "";
  if (periodStart) {
    const d = new Date(periodStart);
    if (periodType === "quarterly") {
      const q = Math.floor(d.getUTCMonth() / 3) + 1;
      periodLabel = `Q${q} '${String(d.getUTCFullYear()).slice(-2)}`;
    } else if (periodType === "annual") {
      periodLabel = String(d.getUTCFullYear());
    } else {
      periodLabel = d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
  }

  const tearSheetPeriod = periodStart
    ? periodType === "quarterly"
      ? (() => {
          const d = new Date(periodStart);
          const q = Math.floor(d.getUTCMonth() / 3) + 1;
          return `Q${q} ${d.getUTCFullYear()}`;
        })()
      : periodStart.slice(0, 4)
    : "";

  return (
    <div className="rounded-xl border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-5">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-success-text)]" />
        <div className="flex-1 space-y-3">
          <div>
            <p className="text-sm font-medium text-[var(--status-success-text)]">
              {card.totalSubmitted} metric{card.totalSubmitted !== 1 ? "s" : ""} submitted{periodLabel ? ` for ${periodLabel}` : ""}
            </p>
            <p className="mt-0.5 text-xs text-[var(--status-success-text)]/70">
              Your investors will see these now.
            </p>
          </div>

          {/* Metric rows */}
          {card.items.length > 0 && (
            <div className="space-y-1">
              {card.items.map((item) => (
                <div
                  key={item.metricName}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="text-[var(--status-success-text)]/80 truncate">
                    {item.metricName}
                  </span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[var(--status-success-text)]">
                      {formatReportValue(item.metricName, item.newValue)}
                    </span>
                    {item.deltaPercent !== null && (
                      <span
                        className={`text-xs font-medium ${
                          item.direction === "up"
                            ? "text-[var(--data-positive)]"
                            : item.direction === "down"
                              ? "text-[var(--data-negative)]"
                              : "text-text-muted"
                        }`}
                      >
                        {item.direction === "up" ? "\u2191" : item.direction === "down" ? "\u2193" : "\u2192"}{" "}
                        {Math.abs(item.deltaPercent).toFixed(1)}%
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Highlights */}
          {(card.biggestGain || card.biggestDecline) && (
            <div className="space-y-1 border-t border-[var(--success-border)] pt-2">
              {card.biggestGain && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--data-positive)]">
                  <Star className="h-3 w-3" />
                  <span>
                    Biggest gain: {card.biggestGain.metricName} (+{Math.abs(card.biggestGain.deltaPercent ?? 0).toFixed(1)}%)
                  </span>
                </div>
              )}
              {card.biggestDecline && (
                <div className="flex items-center gap-1.5 text-xs text-[var(--data-negative)]">
                  <TrendingDown className="h-3 w-3" />
                  <span>
                    Biggest decline: {card.biggestDecline.metricName} ({card.biggestDecline.deltaPercent?.toFixed(1)}%)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex h-8 items-center rounded-md bg-[var(--success-bg-muted)] px-3 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-muted-hover)] transition-colors"
            >
              Back to requests
            </button>
            {tearSheetPeriod && (
              <Link
                href={`/portal/tear-sheets/new?period=${encodeURIComponent(tearSheetPeriod)}`}
                className="inline-flex h-8 items-center rounded-md border border-[var(--success-border)] px-3 text-xs font-medium text-[var(--status-success-text)] hover:bg-[var(--success-bg-subtle)] transition-colors"
              >
                Create Tear Sheet &rarr;
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BatchSubmissionTable({
  initialCompanyId,
  prefilterPeriod,
  onBack,
}: BatchSubmissionTableProps) {
  const [companyId, setCompanyId] = React.useState<string | null>(
    initialCompanyId,
  );
  const [periodType, setPeriodType] = React.useState<PeriodTypeValue>(
    (prefilterPeriod?.periodType as PeriodTypeValue) ?? "quarterly",
  );

  // Raw API data — fetched once on mount
  const [rawRequests, setRawRequests] = React.useState<GroupedRequest[]>([]);
  const [existingValues, setExistingValues] = React.useState<
    Record<string, Record<string, string>>
  >({});
  const [rawMetrics, setRawMetrics] = React.useState<RawMetric[]>([]);
  const [loading, setLoading] = React.useState(true);

  // User-entered data — persists across period type changes
  const [userValues, setUserValues] = React.useState<
    Record<string, Record<string, string>>
  >({});
  // Notes keyed by "periodType:metricName" so quarterly and annual notes are separate
  const [userNotes, setUserNotes] = React.useState<Record<string, string>>({});

  const [cellErrors, setCellErrors] = React.useState<Map<string, string>>(
    new Map(),
  );
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [reportCard, setReportCard] = React.useState<ReportCard | null>(null);
  const [confirmModal, setConfirmModal] = React.useState(false);
  const [detailMetric, setDetailMetric] = React.useState<string | null>(null);
  const [pendingSubmissions, setPendingSubmissions] = React.useState<
    Array<{
      metricName: string;
      periodType: string;
      periodStart: string;
      periodEnd: string;
      value: string;
      notes?: string;
    }>
  >([]);

  // When a prefilterPeriod is set (founder clicked "Submit" on a specific
  // request group), only show the single requested period — no extras.
  const periods = React.useMemo(() => {
    if (prefilterPeriod) {
      const { periodStart, periodEnd } = prefilterPeriod;
      const date = new Date(periodStart);
      let label: string;
      if (periodType === "quarterly") {
        const q = Math.floor(date.getUTCMonth() / 3) + 1;
        label = `Q${q} '${String(date.getUTCFullYear()).slice(-2)}`;
      } else if (periodType === "annual") {
        label = String(date.getUTCFullYear());
      } else {
        label = date.toLocaleDateString("en-US", {
          month: "short",
          year: "2-digit",
        });
      }
      return [
        {
          key: periodStart,
          start: periodStart,
          end: periodEnd,
          label,
          isRequested: true,
        },
      ] as Period[];
    }

    // Fallback: no prefilter (shouldn't happen in normal flow, but safe)
    const requestedStart = null;
    let generated: Period[];
    if (periodType === "quarterly") {
      generated = generateQuarterlyPeriods(requestedStart, 4);
    } else if (periodType === "annual") {
      generated = generateAnnualPeriods(requestedStart, 3);
    } else {
      generated = generateMonthlyPeriods(requestedStart, 6);
    }
    return generated.reverse();
  }, [periodType, prefilterPeriod]);

  // Fetch data once on mount
  React.useEffect(() => {
    async function load() {
      try {
        const [reqRes, metricRes] = await Promise.all([
          fetch("/api/founder/metric-requests"),
          fetch("/api/founder/company-metrics"),
        ]);

        const reqJson = await reqRes.json().catch(() => null);
        const metricJson = await metricRes.json().catch(() => null);

        if (!reqRes.ok)
          throw new Error(reqJson?.error ?? "Failed to load requests.");
        if (!metricRes.ok)
          throw new Error(metricJson?.error ?? "Failed to load metrics.");

        if (reqJson.companyId) setCompanyId(reqJson.companyId);

        const requests: GroupedRequest[] = reqJson.requests ?? [];
        const existingMetrics: Array<{
          metric_name: string;
          period_type: string;
          period_start: string;
          value: { raw?: string } | string | number;
        }> = metricJson.metrics ?? [];

        // Store raw metrics for sparklines/anomalies
        setRawMetrics(existingMetrics as RawMetric[]);

        // Build existing values map: metricName -> periodKey -> value
        const existing: Record<string, Record<string, string>> = {};
        for (const m of existingMetrics) {
          const name = m.metric_name;
          const key = m.period_start;
          if (!existing[name]) existing[name] = {};
          const val = m.value;
          if (typeof val === "object" && val !== null && "raw" in val) {
            existing[name][key] = String(val.raw ?? "");
          } else {
            existing[name][key] = String(val ?? "");
          }
        }
        setExistingValues(existing);
        setRawRequests(requests);
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Derive display rows from raw data + current periods + user edits
  const { requestedRows, otherRows } = React.useMemo(() => {
    // When a specific period is prefiltered, only show metrics requested for
    // that exact period — not metrics from other periods.
    const filteredRequests = prefilterPeriod
      ? rawRequests.filter(
          (r) =>
            r.periodType === prefilterPeriod.periodType &&
            r.periodStart === prefilterPeriod.periodStart &&
            r.periodEnd === prefilterPeriod.periodEnd,
        )
      : rawRequests;

    const rowMap = new Map<
      string,
      {
        metricName: string;
        investorNames: string[];
        investorCount: number;
        requestIds: string[];
      }
    >();

    for (const req of filteredRequests) {
      if (!rowMap.has(req.metricName)) {
        rowMap.set(req.metricName, {
          metricName: req.metricName,
          investorNames: req.investorNames ?? [],
          investorCount: req.investorCount,
          requestIds: [...(req.requestIds ?? [])],
        });
      } else {
        // Merge investor names and request IDs from multiple period groups
        const row = rowMap.get(req.metricName)!;
        for (const name of req.investorNames ?? []) {
          if (!row.investorNames.includes(name)) {
            row.investorNames.push(name);
          }
        }
        for (const id of req.requestIds ?? []) {
          if (!row.requestIds.includes(id)) {
            row.requestIds.push(id);
          }
        }
        row.investorCount = Math.max(row.investorCount, req.investorCount);
      }
    }

    const toBatchRow = (row: {
      metricName: string;
      investorNames: string[];
      investorCount: number;
      requestIds: string[];
    }): BatchRow => {
      const values: Record<string, string> = {};
      for (const p of periods) {
        values[p.key] =
          userValues[row.metricName]?.[p.key] ??
          existingValues[row.metricName]?.[p.key] ??
          "";
      }
      return {
        ...row,
        values,
        notes: userNotes[`${periodType}:${row.metricName}`] ?? "",
      };
    };

    const requested = Array.from(rowMap.values()).map(toBatchRow);

    // Collect "other" metrics: all metric names the company has submitted
    // that aren't in the requested set
    const requestedNames = new Set(
      Array.from(rowMap.keys()).map((n) => n.toLowerCase()),
    );

    const otherMetricNames = new Set<string>();
    for (const m of rawMetrics) {
      if (
        m.period_type === periodType &&
        !requestedNames.has(m.metric_name.toLowerCase())
      ) {
        otherMetricNames.add(m.metric_name);
      }
    }

    const others: BatchRow[] = Array.from(otherMetricNames)
      .sort((a, b) => a.localeCompare(b))
      .map((name) =>
        toBatchRow({
          metricName: name,
          investorNames: [],
          investorCount: 0,
          requestIds: [],
        }),
      );

    return { requestedRows: requested, otherRows: others };
  }, [rawRequests, prefilterPeriod, periods, periodType, userValues, userNotes, existingValues, rawMetrics]);

  // Combined rows for submission logic
  const allRows = React.useMemo(
    () => [...requestedRows, ...otherRows],
    [requestedRows, otherRows],
  );

  const validateCell = React.useCallback((cellKey: string, value: string) => {
    setCellErrors((prev) => {
      const next = new Map(prev);
      if (value && isNaN(Number(value))) {
        next.set(cellKey, "Must be a number");
      } else {
        next.delete(cellKey);
      }
      return next;
    });
  }, []);

  const updateCellValue = React.useCallback(
    (metricName: string, periodKey: string, value: string) => {
      setUserValues((prev) => ({
        ...prev,
        [metricName]: { ...prev[metricName], [periodKey]: value },
      }));
      validateCell(`${metricName}:${periodKey}`, value);
    },
    [validateCell],
  );

  const updateNotes = React.useCallback(
    (metricName: string, notes: string) => {
      setUserNotes((prev) => ({
        ...prev,
        [`${periodType}:${metricName}`]: notes,
      }));
    },
    [periodType],
  );

  function prepareSubmissions() {
    if (!companyId) return;

    // Collect all non-empty values that differ from existing
    const submissions: Array<{
      metricName: string;
      periodType: string;
      periodStart: string;
      periodEnd: string;
      value: string;
      notes?: string;
    }> = [];

    for (const row of allRows) {
      for (const period of periods) {
        const val = row.values[period.key]?.trim();
        if (!val) continue;
        // Only submit if value changed from existing
        const existing = existingValues[row.metricName]?.[period.key];
        if (existing === val) continue;

        submissions.push({
          metricName: row.metricName,
          periodType: periodType,
          periodStart: period.start,
          periodEnd: period.end,
          value: val,
          notes: row.notes?.trim() || undefined,
        });
      }
    }

    // Allow empty submissions — founder is marking the period as complete
    setPendingSubmissions(submissions);
    setConfirmModal(true);
  }

  async function handleSubmitAll() {
    if (!companyId) return;
    setConfirmModal(false);
    setSubmitting(true);
    setError(null);
    setReportCard(null);

    const submissions = pendingSubmissions;

    // Only fulfill request IDs from requested rows (other rows have none)
    const fulfillRequestIds = requestedRows.flatMap((r) => r.requestIds);

    try {
      const res = await fetch("/api/metrics/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, submissions, fulfillRequestIds }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Submission failed.");

      // Build report card before clearing state
      const currentPeriodStart = periods[0]?.start ?? "";
      const card = buildReportCard(
        submissions.map((s) => ({ metricName: s.metricName, value: s.value })),
        rawMetrics,
        periodType,
        currentPeriodStart,
      );
      setReportCard(card);

      // Remove requested rows for this period — the period is complete
      const requestedNames = new Set(requestedRows.map((r) => r.metricName));
      const remaining = rawRequests.filter(
        (r) => !requestedNames.has(r.metricName),
      );
      setRawRequests(remaining);

      // Update existing values cache
      const updated = { ...existingValues };
      for (const sub of submissions) {
        if (!updated[sub.metricName]) updated[sub.metricName] = {};
        updated[sub.metricName][sub.periodStart] = sub.value;
      }
      setExistingValues(updated);

      // Clear user-entered data for all submitted metrics
      const allNames = new Set(allRows.map((r) => r.metricName));
      setUserValues((prev) => {
        const next = { ...prev };
        for (const name of allNames) delete next[name];
        return next;
      });
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-sm text-text-muted hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </button>

        {/* Only show period type toggle when there's no prefilter (no specific request) */}
        {!prefilterPeriod && (
          <SlidingTabs
            tabs={PERIOD_TYPE_TABS}
            value={periodType}
            onChange={setPeriodType}
            size="sm"
            showIcons={false}
          />
        )}
      </div>

      {allRows.length === 0 && !reportCard ? (
        <div className="rounded-xl border border-border-default card-surface p-6 text-center">
          <p className="text-text-tertiary">No metrics requested yet.</p>
          <p className="mt-1 text-sm text-text-muted">
            Metrics will appear here when an investor sends you a request.
          </p>
          <Link
            href="/portal/historical-upload"
            className="mt-3 inline-block text-sm text-text-tertiary hover:text-text-secondary underline underline-offset-2"
          >
            Import historical metrics instead
          </Link>
        </div>
      ) : reportCard ? (
        <ReportCardView
          card={reportCard}
          periodType={periodType}
          periodStart={pendingSubmissions[0]?.periodStart ?? ""}
          onBack={onBack}
        />
      ) : (
        <>
        {cellErrors.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-4 py-2.5 text-sm text-[var(--status-error-text)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{cellErrors.size} value{cellErrors.size !== 1 ? "s" : ""} need attention — fix errors before submitting</span>
          </div>
        )}
        <BatchTableBody
          requestedRows={requestedRows}
          otherRows={otherRows}
          periods={periods}
          existingValues={existingValues}
          cellErrors={cellErrors}
          updateCellValue={updateCellValue}
          updateNotes={updateNotes}
          setDetailMetric={setDetailMetric}
          rawMetrics={rawMetrics}
          periodType={periodType}
        />
        </>
      )}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {allRows.length > 0 && !reportCard && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={prepareSubmissions}
            disabled={submitting || cellErrors.size > 0}
            title={cellErrors.size > 0 ? `Fix ${cellErrors.size} invalid value${cellErrors.size !== 1 ? "s" : ""} before submitting` : undefined}
            className="inline-flex h-10 items-center justify-center rounded-md bg-btn-primary-bg px-5 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-[var(--ring-focus)]"
          >
            {submitting
              ? "Submitting..."
              : cellErrors.size > 0
                ? `Submit all (${cellErrors.size} error${cellErrors.size !== 1 ? "s" : ""})`
                : "Submit all"}
          </button>
        </div>
      )}

      {/* Metric Detail Panel */}
      {detailMetric && companyId && (
        <MetricDetailPanel
          companyId={companyId}
          metricName={detailMetric}
          onClose={() => setDetailMetric(null)}
          editable
        />
      )}

      <ConfirmModal
        open={confirmModal}
        title="Confirm Submission"
        message={
          pendingSubmissions.length > 0
            ? `Submit ${pendingSubmissions.length} metric value${pendingSubmissions.length !== 1 ? "s" : ""} and mark all requests as complete? Values will be visible to approved investors.`
            : "Mark all requests as complete with no values submitted? You can submit values later."
        }
        confirmLabel="Submit"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleSubmitAll}
        onCancel={() => setConfirmModal(false)}
      />
    </div>
  );
}

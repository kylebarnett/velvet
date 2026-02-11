"use client";

import * as React from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";
import { MetricDetailPanel } from "@/components/metrics/metric-detail-panel";
import { SlidingTabs, TabItem } from "@/components/ui/sliding-tabs";
import { getMetricDefinition } from "@/lib/metric-definitions";

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

type Period = {
  key: string;
  start: string;
  end: string;
  label: string;
  isRequested: boolean;
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

// Format a local Date as YYYY-MM-DD without timezone shift.
// Using toISOString() converts to UTC first, which shifts the date
// backwards in US timezones (e.g. 2026-01-01 local → 2025-12-31 UTC).
function fmtDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function generateQuarterlyPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let date: Date;

  if (requestedStart) {
    // Parse YYYY-MM-DD as local date (not UTC) by splitting manually
    const [y, mo, d] = requestedStart.split("-").map(Number);
    date = new Date(y, mo - 1, d);
  } else {
    const now = new Date();
    // Start from the current quarter so founders can submit for it
    const currentQ = Math.floor(now.getMonth() / 3);
    date = new Date(now.getFullYear(), currentQ * 3, 1);
  }

  for (let i = 0; i < count; i++) {
    const qMonth = date.getMonth();
    const qYear = date.getFullYear();
    const q = Math.floor(qMonth / 3) + 1;
    const start = new Date(qYear, (q - 1) * 3, 1);
    const end = new Date(qYear, q * 3, 0);

    const startStr = fmtDate(start);
    const endStr = fmtDate(end);
    periods.push({
      key: startStr,
      start: startStr,
      end: endStr,
      label: `Q${q} '${String(qYear).slice(-2)}`,
      isRequested: requestedStart === startStr,
    });

    // Move to previous quarter
    date = new Date(qYear, (q - 2) * 3, 1);
  }

  return periods;
}

function generateAnnualPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let year: number;

  if (requestedStart) {
    year = parseInt(requestedStart.split("-")[0], 10);
  } else {
    year = new Date().getFullYear();
  }

  for (let i = 0; i < count; i++) {
    const start = `${year}-01-01`;
    const end = `${year}-12-31`;
    periods.push({
      key: start,
      start,
      end,
      label: String(year),
      isRequested: requestedStart === start,
    });
    year--;
  }

  return periods;
}

function generateMonthlyPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let date: Date;

  if (requestedStart) {
    const [y, mo, d] = requestedStart.split("-").map(Number);
    date = new Date(y, mo - 1, d);
  } else {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  for (let i = 0; i < count; i++) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const startStr = fmtDate(start);

    periods.push({
      key: startStr,
      start: startStr,
      end: fmtDate(end),
      label: start.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      isRequested: requestedStart === startStr,
    });

    date = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  }

  return periods;
}

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
              <p className="mt-0.5 text-xs text-emerald-400">{info.formula}</p>
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
  rows: BatchRow[];
  periods: Period[];
  existingValues: Record<string, Record<string, string>>;
  cellErrors: Map<string, string>;
  updateCellValue: (metricName: string, periodKey: string, value: string) => void;
  updateNotes: (metricName: string, notes: string) => void;
  setDetailMetric: React.Dispatch<React.SetStateAction<string | null>>;
};

function BatchTableBody({
  rows,
  periods,
  existingValues,
  cellErrors,
  updateCellValue,
  updateNotes,
  setDetailMetric,
}: BatchTableBodyProps) {
  const parentRef = React.useRef<HTMLDivElement>(null);
  const shouldVirtualize = rows.length > BATCH_VIRTUALIZE_THRESHOLD;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => BATCH_ESTIMATED_ROW_HEIGHT,
    overscan: 10,
    enabled: shouldVirtualize,
  });

  // Column count: metric + periods + notes
  const colCount = 1 + periods.length + 1;

  const renderRow = (row: BatchRow) => (
    <>
      <td className="sticky left-0 z-10 bg-bg-primary px-4 py-2">
        <div className="flex items-start gap-1.5">
          <button
            type="button"
            onClick={() => setDetailMetric(row.metricName)}
            className="font-medium text-text-primary hover:text-text-primary hover:underline underline-offset-2 text-left"
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
      </td>
      {periods.map((p) => {
        const existing = existingValues[row.metricName]?.[p.key];
        const hasExisting = !!existing;
        const cellKey = `${row.metricName}:${p.key}`;
        const cellError = cellErrors.get(cellKey);
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
                    ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/20"
                    : hasExisting && !row.values[p.key]
                      ? "border-border-subtle text-text-muted focus:border-border-default focus:ring-[var(--ring-focus)]"
                      : "border-border-default text-text-primary focus:border-border-default focus:ring-[var(--ring-focus)]"
                }`}
              />
              {cellError && (
                <div className="absolute left-1/2 top-full z-10 mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-red-900/90 px-2 py-0.5 text-[10px] text-[var(--status-error-text)]">
                  {cellError}
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

  if (!shouldVirtualize) {
    return (
      <div className="overflow-x-auto rounded-xl border border-border-default">
        <table className="w-full text-sm">
          <thead>{theadContent}</thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.metricName} className="border-b border-border-subtle">
                {renderRow(row)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Virtualized rendering
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
            const row = rows[virtualRow.index];
            return (
              <tr
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                className="border-b border-border-subtle"
              >
                {renderRow(row)}
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
  const [success, setSuccess] = React.useState<string | null>(null);
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

  // Generate periods based on type — reversed to chronological (oldest left)
  const periods = React.useMemo(() => {
    const requestedStart = prefilterPeriod?.periodStart ?? null;
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
          period_start: string;
          value: { raw?: string } | string | number;
        }> = metricJson.metrics ?? [];

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
  const rows = React.useMemo(() => {
    const rowMap = new Map<
      string,
      {
        metricName: string;
        investorNames: string[];
        investorCount: number;
        requestIds: string[];
      }
    >();

    for (const req of rawRequests) {
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

    return Array.from(rowMap.values()).map((row) => {
      const values: Record<string, string> = {};
      for (const p of periods) {
        // User-entered value takes priority, then existing DB value, then empty
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
    });
  }, [rawRequests, periods, periodType, userValues, userNotes, existingValues]);

  // Auto-dismiss success
  React.useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [success]);

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

    for (const row of rows) {
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

    if (submissions.length === 0) {
      setError("No new or changed values to submit.");
      return;
    }

    setPendingSubmissions(submissions);
    setConfirmModal(true);
  }

  async function handleSubmitAll() {
    if (!companyId) return;
    setConfirmModal(false);
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    const submissions = pendingSubmissions;

    // Collect all request IDs for submitted metrics so the API can
    // directly mark them as fulfilled (no fragile date matching needed)
    const submittedNames = new Set(submissions.map((s) => s.metricName));
    const fulfillRequestIds = rows
      .filter((r) => submittedNames.has(r.metricName))
      .flatMap((r) => r.requestIds);

    try {
      const res = await fetch("/api/metrics/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, submissions, fulfillRequestIds }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Submission failed.");

      // Remove submitted metric rows from the table
      const remaining = rawRequests.filter(
        (r) => !submittedNames.has(r.metricName),
      );
      setRawRequests(remaining);

      // Update existing values cache
      const updated = { ...existingValues };
      for (const sub of submissions) {
        if (!updated[sub.metricName]) updated[sub.metricName] = {};
        updated[sub.metricName][sub.periodStart] = sub.value;
      }
      setExistingValues(updated);

      // Clear user-entered data for submitted metrics
      setUserValues((prev) => {
        const next = { ...prev };
        for (const name of submittedNames) delete next[name];
        return next;
      });

      const submittedCount = json.submitted ?? submissions.length;
      const failedCount = json.failed ?? 0;

      if (remaining.length === 0) {
        setSuccess(
          `all_done:${submittedCount}:${periodType}`,
        );
      } else {
        setSuccess(
          `partial:${submittedCount}:${failedCount}:${remaining.length}`,
        );
      }
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

        {/* Period type toggle */}
        <SlidingTabs
          tabs={PERIOD_TYPE_TABS}
          value={periodType}
          onChange={setPeriodType}
          size="sm"
          showIcons={false}
        />
      </div>

      {rows.length === 0 ? (
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
      ) : (
        <>
        {cellErrors.size > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-4 py-2.5 text-sm text-[var(--status-error-text)]">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>{cellErrors.size} value{cellErrors.size !== 1 ? "s" : ""} need attention — fix errors before submitting</span>
          </div>
        )}
        <BatchTableBody
          rows={rows}
          periods={periods}
          existingValues={existingValues}
          cellErrors={cellErrors}
          updateCellValue={updateCellValue}
          updateNotes={updateNotes}
          setDetailMetric={setDetailMetric}
        />
        </>
      )}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {success && (() => {
        const parts = success.split(":");
        const isAllDone = parts[0] === "all_done";
        const count = parseInt(parts[1], 10) || 0;
        const failedCount = isAllDone ? 0 : parseInt(parts[2], 10) || 0;
        const remainingCount = isAllDone ? 0 : parseInt(parts[3], 10) || 0;

        return (
          <div className="rounded-xl border border-[var(--status-success-bg)] bg-[var(--status-success-bg)] p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[var(--status-success-text)]" />
              <div className="flex-1 space-y-1">
                <p className="text-sm font-medium text-[var(--status-success-text)]">
                  {count} metric{count !== 1 ? "s" : ""} submitted for {periodType === "quarterly" ? "this quarter" : "this period"}
                </p>
                <p className="text-xs text-[var(--status-success-text)]/70">
                  Your investors will see these immediately.
                </p>
                {failedCount > 0 && (
                  <p className="text-xs text-[var(--status-warning-text)]">
                    {failedCount} value{failedCount !== 1 ? "s" : ""} failed to submit.
                  </p>
                )}
                {isAllDone ? (
                  <button
                    type="button"
                    onClick={onBack}
                    className="mt-2 inline-flex h-8 items-center rounded-md bg-emerald-500/20 px-3 text-xs font-medium text-[var(--status-success-text)] hover:bg-emerald-500/30 transition-colors"
                  >
                    Back to requests
                  </button>
                ) : remainingCount > 0 ? (
                  <p className="text-xs text-text-muted">
                    You still have {remainingCount} pending metric{remainingCount !== 1 ? "s" : ""} to submit.
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })()}

      {rows.length > 0 && (
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
        message={`Submit ${pendingSubmissions.length} metric value${pendingSubmissions.length !== 1 ? "s" : ""}? These will be visible to approved investors.`}
        confirmLabel="Submit"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={handleSubmitAll}
        onCancel={() => setConfirmModal(false)}
      />
    </div>
  );
}

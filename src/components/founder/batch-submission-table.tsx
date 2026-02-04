"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

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
    // Start from the previous completed quarter
    const currentQ = Math.floor(now.getMonth() / 3);
    date = new Date(now.getFullYear(), (currentQ - 1) * 3, 1);
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
    year = new Date().getFullYear() - 1;
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

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="h-5 w-32 animate-pulse rounded bg-white/10" />
        <div className="h-8 w-40 animate-pulse rounded-lg bg-white/10" />
      </div>
      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-white/5">
              <th className="px-4 py-3 text-left">
                <div className="h-4 w-16 animate-pulse rounded bg-white/10" />
              </th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} className="px-3 py-3 text-center">
                  <div className="mx-auto h-4 w-14 animate-pulse rounded bg-white/10" />
                </th>
              ))}
              <th className="px-3 py-3">
                <div className="h-4 w-12 animate-pulse rounded bg-white/10" />
              </th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r} className="border-b border-white/5">
                <td className="px-4 py-3">
                  <div className="h-4 w-24 animate-pulse rounded bg-white/10" />
                </td>
                {[0, 1, 2, 3].map((c) => (
                  <td key={c} className="px-2 py-3">
                    <div className="mx-auto h-9 w-full animate-pulse rounded-md bg-white/5" />
                  </td>
                ))}
                <td className="px-2 py-3">
                  <div className="h-9 w-full animate-pulse rounded-md bg-white/5" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
  const [periodType, setPeriodType] = React.useState<string>(
    prefilterPeriod?.periodType ?? "quarterly",
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

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [confirmModal, setConfirmModal] = React.useState(false);
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

  function updateCellValue(
    metricName: string,
    periodKey: string,
    value: string,
  ) {
    setUserValues((prev) => ({
      ...prev,
      [metricName]: { ...prev[metricName], [periodKey]: value },
    }));
  }

  function updateNotes(metricName: string, notes: string) {
    setUserNotes((prev) => ({
      ...prev,
      [`${periodType}:${metricName}`]: notes,
    }));
  }

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

      if (remaining.length === 0) {
        // All metrics submitted — go back to pending view
        onBack();
      } else {
        setSuccess(
          `Submitted ${json.submitted} metric${json.submitted !== 1 ? "s" : ""} successfully.${json.failed > 0 ? ` ${json.failed} failed.` : ""}`,
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
          className="flex items-center gap-1 text-sm text-white/50 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to requests
        </button>

        {/* Period type toggle */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-black/20 p-0.5">
          {(
            [
              { value: "quarterly", label: "Quarterly" },
              { value: "annual", label: "Annual" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriodType(opt.value)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                periodType === opt.value
                  ? "bg-white/10 text-white"
                  : "text-white/50 hover:text-white/70"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
          <p className="text-white/60">No metrics requested yet.</p>
          <p className="mt-1 text-sm text-white/40">
            Metrics will appear here when an investor sends you a request.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 bg-white/5">
                <th className="sticky left-0 z-10 bg-white/5 px-4 py-3 text-left font-medium text-white/70">
                  Metric
                </th>
                {periods.map((p) => (
                  <th
                    key={p.key}
                    className={`px-3 py-3 text-center font-medium text-white/70 min-w-[120px] ${
                      p.isRequested ? "bg-white/[0.08]" : ""
                    }`}
                  >
                    {p.label}
                  </th>
                ))}
                <th className="px-3 py-3 text-left font-medium text-white/70 min-w-[160px]">
                  Notes
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.metricName} className="border-b border-white/5">
                  <td className="sticky left-0 z-10 bg-zinc-950 px-4 py-2">
                    <div className="font-medium text-white/90">
                      {row.metricName}
                    </div>
                    {row.investorNames.length > 0 && (
                      <div className="text-[10px] text-white/40">
                        {row.investorNames.join(", ")}
                      </div>
                    )}
                  </td>
                  {periods.map((p) => {
                    const existing =
                      existingValues[row.metricName]?.[p.key];
                    const hasExisting = !!existing;
                    return (
                      <td
                        key={p.key}
                        className={`px-2 py-2 ${p.isRequested ? "bg-white/[0.08]" : ""}`}
                      >
                        <input
                          type="text"
                          value={row.values[p.key] ?? ""}
                          onChange={(e) =>
                            updateCellValue(
                              row.metricName,
                              p.key,
                              e.target.value,
                            )
                          }
                          placeholder={hasExisting ? existing : "\u2014"}
                          className={`h-9 w-full rounded-md border bg-black/30 px-2 text-center text-sm font-mono outline-none focus:border-white/20 ${
                            hasExisting && !row.values[p.key]
                              ? "border-white/5 text-white/40"
                              : "border-white/10 text-white"
                          }`}
                        />
                      </td>
                    );
                  })}
                  <td className="px-2 py-2">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) =>
                        updateNotes(row.metricName, e.target.value)
                      }
                      placeholder="Optional notes..."
                      className="h-9 w-full rounded-md border border-white/10 bg-black/30 px-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={prepareSubmissions}
            disabled={submitting}
            className="inline-flex h-10 items-center justify-center rounded-md bg-white px-5 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
          >
            {submitting ? "Submitting..." : "Submit all"}
          </button>
        </div>
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

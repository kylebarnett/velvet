"use client";

import * as React from "react";
import { ArrowLeft, Plus, X } from "lucide-react";
import { ConfirmModal } from "@/components/ui/confirm-modal";

type GroupedRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  investorCount: number;
  hasSubmission: boolean;
};

type SubmissionRow = {
  metricName: string;
  values: Record<string, string>; // period key -> value
  notes: string;
  investorCount: number;
  isFromRequest: boolean;
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

function generateQuarterlyPeriods(
  requestedStart: string | null,
  count: number,
): Period[] {
  const periods: Period[] = [];
  let date: Date;

  if (requestedStart) {
    date = new Date(requestedStart);
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

    const key = `${start.toISOString().split("T")[0]}`;
    periods.push({
      key,
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
      label: `Q${q} '${String(qYear).slice(-2)}`,
      isRequested: requestedStart === key,
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
    year = new Date(requestedStart).getFullYear();
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
    date = new Date(requestedStart);
  } else {
    const now = new Date();
    date = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }

  for (let i = 0; i < count; i++) {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const key = start.toISOString().split("T")[0];

    periods.push({
      key,
      start: key,
      end: end.toISOString().split("T")[0],
      label: start.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
      }),
      isRequested: requestedStart === key,
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
              <th className="px-4 py-3 text-left"><div className="h-4 w-16 animate-pulse rounded bg-white/10" /></th>
              {[0, 1, 2, 3].map((i) => (
                <th key={i} className="px-3 py-3 text-center"><div className="mx-auto h-4 w-14 animate-pulse rounded bg-white/10" /></th>
              ))}
              <th className="px-3 py-3"><div className="h-4 w-12 animate-pulse rounded bg-white/10" /></th>
            </tr>
          </thead>
          <tbody>
            {[0, 1, 2].map((r) => (
              <tr key={r} className="border-b border-white/5">
                <td className="px-4 py-3"><div className="h-4 w-24 animate-pulse rounded bg-white/10" /></td>
                {[0, 1, 2, 3].map((c) => (
                  <td key={c} className="px-2 py-3"><div className="mx-auto h-9 w-full animate-pulse rounded-md bg-white/5" /></td>
                ))}
                <td className="px-2 py-3"><div className="h-9 w-full animate-pulse rounded-md bg-white/5" /></td>
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
  const [rows, setRows] = React.useState<SubmissionRow[]>([]);
  const [existingValues, setExistingValues] = React.useState<
    Record<string, Record<string, string>>
  >({});
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);
  const [newMetricName, setNewMetricName] = React.useState("");
  const [showAddMetric, setShowAddMetric] = React.useState(false);
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
  const [allMetricNames, setAllMetricNames] = React.useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = React.useState(false);

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

  // Load requests and existing values
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

        // Collect all known metric names for suggestions
        const knownNames = new Set<string>();
        for (const m of existingMetrics) knownNames.add(m.metric_name);
        for (const r of requests) knownNames.add(r.metricName);
        setAllMetricNames(Array.from(knownNames).sort());

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

        // Build rows from requests
        const rowMap = new Map<string, SubmissionRow>();

        // Add rows from pending requests
        for (const req of requests) {
          if (!rowMap.has(req.metricName)) {
            const values: Record<string, string> = {};
            // Pre-fill from existing values
            for (const p of periods) {
              values[p.key] = existing[req.metricName]?.[p.key] ?? "";
            }
            rowMap.set(req.metricName, {
              metricName: req.metricName,
              values,
              notes: "",
              investorCount: req.investorCount,
              isFromRequest: true,
            });
          }
        }

        setRows(Array.from(rowMap.values()));
      } catch (e: unknown) {
        const message =
          e instanceof Error ? e.message : "Something went wrong.";
        setError(message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [periods]);

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
    setRows((prev) =>
      prev.map((r) =>
        r.metricName === metricName
          ? { ...r, values: { ...r.values, [periodKey]: value } }
          : r,
      ),
    );
  }

  function updateNotes(metricName: string, notes: string) {
    setRows((prev) =>
      prev.map((r) => (r.metricName === metricName ? { ...r, notes } : r)),
    );
  }

  function addMetricRow(name?: string) {
    const metricName = (name ?? newMetricName).trim();
    if (!metricName || rows.some((r) => r.metricName === metricName)) return;
    const values: Record<string, string> = {};
    for (const p of periods) {
      values[p.key] = existingValues[metricName]?.[p.key] ?? "";
    }
    setRows([
      ...rows,
      {
        metricName,
        values,
        notes: "",
        investorCount: 0,
        isFromRequest: false,
      },
    ]);
    setNewMetricName("");
    setShowAddMetric(false);
    setShowSuggestions(false);
  }

  function removeRow(metricName: string) {
    setRows((prev) => prev.filter((r) => r.metricName !== metricName));
  }

  function prepareSubmissions() {
    if (!companyId) return;

    // Collect all non-empty values
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

    try {
      const res = await fetch("/api/metrics/submit-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId, submissions }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Submission failed.");

      setSuccess(
        `Submitted ${json.submitted} metric${json.submitted !== 1 ? "s" : ""} successfully.${json.failed > 0 ? ` ${json.failed} failed.` : ""}`,
      );

      // Update existing values cache
      const updated = { ...existingValues };
      for (const sub of submissions) {
        if (!updated[sub.metricName]) updated[sub.metricName] = {};
        updated[sub.metricName][sub.periodStart] = sub.value;
      }
      setExistingValues(updated);
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Something went wrong.";
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // Suggestions for add metric input
  const suggestions = React.useMemo(() => {
    if (!newMetricName.trim()) return [];
    const currentNames = new Set(rows.map((r) => r.metricName));
    return allMetricNames.filter(
      (name) =>
        !currentNames.has(name) &&
        name.toLowerCase().includes(newMetricName.toLowerCase()),
    );
  }, [newMetricName, allMetricNames, rows]);

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
          <p className="text-white/60">No metrics to submit.</p>
          <button
            type="button"
            onClick={() => setShowAddMetric(true)}
            className="mt-3 inline-flex items-center gap-1 text-sm text-white/70 hover:text-white"
          >
            <Plus className="h-4 w-4" />
            Add a metric
          </button>
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
                <th className="px-2 py-3 w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.metricName} className="border-b border-white/5">
                  <td className="sticky left-0 z-10 bg-zinc-950 px-4 py-2">
                    <div className="font-medium text-white/90">
                      {row.metricName}
                    </div>
                    {row.investorCount > 0 && (
                      <div className="text-[10px] text-white/40">
                        {row.investorCount} investor
                        {row.investorCount !== 1 ? "s" : ""}
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
                  <td className="px-2 py-2">
                    {!row.isFromRequest && (
                      <button
                        type="button"
                        onClick={() => removeRow(row.metricName)}
                        className="rounded p-1 text-white/30 hover:bg-white/10 hover:text-white/60"
                        title="Remove"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add metric row */}
      <div className="flex items-center gap-2">
        {showAddMetric ? (
          <div className="relative flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                value={newMetricName}
                onChange={(e) => {
                  setNewMetricName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                placeholder="Metric name (e.g. Revenue)"
                className="h-9 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") addMetricRow();
                  if (e.key === "Escape") {
                    setShowAddMetric(false);
                    setNewMetricName("");
                    setShowSuggestions(false);
                  }
                }}
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute left-0 top-full z-20 mt-1 max-h-40 w-full overflow-y-auto rounded-md border border-white/10 bg-zinc-900 py-1 shadow-xl">
                  {suggestions.map((name) => (
                    <button
                      key={name}
                      type="button"
                      className="w-full px-3 py-1.5 text-left text-sm text-white/70 hover:bg-white/10"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        addMetricRow(name);
                      }}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => addMetricRow()}
              disabled={!newMetricName.trim()}
              className="h-9 rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90 disabled:opacity-50"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setShowAddMetric(false);
                setNewMetricName("");
                setShowSuggestions(false);
              }}
              className="h-9 rounded-md border border-white/10 px-3 text-xs text-white/60 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddMetric(true)}
            className="flex items-center gap-1 text-xs text-white/50 hover:text-white/70"
          >
            <Plus className="h-3.5 w-3.5" />
            Add metric
          </button>
        )}
      </div>

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

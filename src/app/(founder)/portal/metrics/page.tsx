"use client";

import * as React from "react";

type MetricValue = {
  id: string;
  metric_name: string;
  period_type: string;
  period_start: string;
  period_end: string;
  value: { raw: string };
  notes: string | null;
  submitted_at: string;
  updated_at: string;
};

export default function FounderMetricsPage() {
  const [metrics, setMetrics] = React.useState<MetricValue[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/company-metrics");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        setMetrics(json.metrics ?? []);
      } catch (e: any) {
        setError(e?.message ?? "Something went wrong.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Submitted metrics</h1>
        <p className="text-sm text-white/60">
          History of all metrics you have submitted.
        </p>
      </div>

      {loading && <div className="text-sm text-white/60">Loading metrics...</div>}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && metrics.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">No metrics submitted yet.</div>
        </div>
      )}

      {metrics.length > 0 && (
        <>
          {/* Mobile Card View */}
          <div className="space-y-3 sm:hidden">
            {metrics.map((m) => (
              <div
                key={m.id}
                className="rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium">{m.metric_name}</div>
                    <div className="mt-0.5 text-xs text-white/50">{m.period_type}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-lg">{m.value?.raw ?? "—"}</div>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs text-white/50 border-t border-white/5 pt-3">
                  <span>{m.period_start} to {m.period_end}</span>
                  <span>{new Date(m.submitted_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block overflow-hidden rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-white/5">
                  <th className="px-4 py-3 font-medium text-white/70">Metric</th>
                  <th className="px-4 py-3 font-medium text-white/70">Period</th>
                  <th className="px-4 py-3 font-medium text-white/70">Value</th>
                  <th className="px-4 py-3 font-medium text-white/70">Submitted</th>
                </tr>
              </thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.id} className="border-b border-white/5">
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.metric_name}</div>
                      <div className="text-xs text-white/50">{m.period_type}</div>
                    </td>
                    <td className="px-4 py-3 text-white/70">
                      {m.period_start} to {m.period_end}
                    </td>
                    <td className="px-4 py-3 font-mono">{m.value?.raw ?? "—"}</td>
                    <td className="px-4 py-3 text-white/50">
                      {new Date(m.submitted_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

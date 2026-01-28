"use client";

import * as React from "react";

type GroupedRequest = {
  metricName: string;
  periodType: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string | null;
  status: string;
  investorCount: number;
  requestIds: string[];
  hasSubmission: boolean;
};

export default function FounderRequestsPage() {
  const [companyId, setCompanyId] = React.useState<string | null>(null);
  const [requests, setRequests] = React.useState<GroupedRequest[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  async function loadRequests() {
    try {
      const res = await fetch("/api/founder/metric-requests");
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
      setCompanyId(json.companyId);
      setRequests(json.requests ?? []);
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadRequests();
  }, []);

  const pendingRequests = requests.filter((r) => !r.hasSubmission);
  const submittedRequests = requests.filter((r) => r.hasSubmission);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Metric requests</h1>
        <p className="text-sm text-white/60">
          Submit requested metrics from your investors. Submit once and all
          approved investors see the value.
        </p>
      </div>

      {loading && <div className="text-sm text-white/60">Loading requests...</div>}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && pendingRequests.length === 0 && submittedRequests.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">No metric requests yet.</div>
        </div>
      )}

      {pendingRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white/70">Pending</h2>
          {pendingRequests.map((req) => (
            <RequestCard
              key={`${req.metricName}-${req.periodStart}-${req.periodEnd}`}
              request={req}
              companyId={companyId!}
              onSubmitted={loadRequests}
            />
          ))}
        </div>
      )}

      {submittedRequests.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-white/70">Submitted</h2>
          {submittedRequests.map((req) => (
            <div
              key={`${req.metricName}-${req.periodStart}-${req.periodEnd}`}
              className="rounded-xl border border-white/10 bg-white/5 p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{req.metricName}</span>
                  <span className="ml-2 text-xs text-white/50">
                    {req.periodType} &middot; {req.periodStart} to {req.periodEnd}
                  </span>
                </div>
                <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-medium text-emerald-200">
                  Submitted
                </span>
              </div>
              <div className="mt-1 text-xs text-white/50">
                {req.investorCount} investor{req.investorCount !== 1 ? "s" : ""} requested
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  request,
  companyId,
  onSubmitted,
}: {
  request: GroupedRequest;
  companyId: string;
  onSubmitted: () => void;
}) {
  const [value, setValue] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [expanded, setExpanded] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/metrics/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          metricName: request.metricName,
          periodType: request.periodType,
          periodStart: request.periodStart,
          periodEnd: request.periodEnd,
          value: value.trim(),
          notes: notes.trim() || undefined,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.error ?? "Failed to submit.");
      onSubmitted();
    } catch (e: any) {
      setError(e?.message ?? "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{request.metricName}</span>
            <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-medium text-amber-200">
              Pending
            </span>
          </div>
          <div className="mt-1 text-xs text-white/50">
            {request.periodType} &middot; {request.periodStart} to {request.periodEnd}
            {request.dueDate && (
              <span className="ml-2">
                &middot; Due {request.dueDate}
              </span>
            )}
          </div>
          <div className="mt-1 text-xs text-white/50">
            {request.investorCount} investor{request.investorCount !== 1 ? "s" : ""} requested
          </div>
        </div>
        <button
          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md bg-white px-3 text-xs font-medium text-black hover:bg-white/90"
          onClick={() => setExpanded(!expanded)}
          type="button"
        >
          {expanded ? "Cancel" : "Submit"}
        </button>
      </div>

      {expanded && (
        <form className="mt-4 space-y-3" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label className="text-xs text-white/70" htmlFor={`value-${request.metricName}`}>
              Value
            </label>
            <input
              id={`value-${request.metricName}`}
              className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
              placeholder="e.g. 72500"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <label className="text-xs text-white/70" htmlFor={`notes-${request.metricName}`}>
              Notes (optional)
            </label>
            <textarea
              id={`notes-${request.metricName}`}
              className="min-h-16 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/20"
              placeholder="Any context for your investors..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              className="inline-flex h-9 items-center justify-center rounded-md bg-white px-4 text-sm font-medium text-black hover:bg-white/90 disabled:opacity-60"
              disabled={submitting || !value.trim()}
              type="submit"
            >
              {submitting ? "Submitting..." : "Submit metric"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

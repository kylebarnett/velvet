"use client";

import * as React from "react";
import { Search, Users, CheckCircle2, Loader2 } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { InvestorApprovalCard } from "@/components/founder/investor-approval-card";

type Investor = {
  id: string;
  investor_id: string;
  approval_status: string;
  is_inviting_investor: boolean;
  created_at: string;
  org_name?: string | null;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

type DataCounts = {
  metrics: number;
  documents: number;
  tearSheets: number;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border-default card-surface p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 w-32 rounded bg-bg-hover" />
                <div className="h-5 w-20 rounded-full bg-bg-elevated" />
              </div>
              <div className="h-3 w-44 rounded bg-bg-elevated" />
              <div className="h-5 w-16 rounded-full bg-bg-hover" />
            </div>
            <div className="h-8 w-20 rounded-md bg-bg-hover" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FounderInvestorsPage() {
  const [investors, setInvestors] = React.useState<Investor[]>([]);
  const [dataCounts, setDataCounts] = React.useState<DataCounts>({ metrics: 0, documents: 0, tearSheets: 0 });
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [bulkApproving, setBulkApproving] = React.useState(false);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/investors");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        setInvestors(json.investors ?? []);
        if (json.dataCounts) setDataCounts(json.dataCounts);
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

  const filteredInvestors = React.useMemo(() => {
    if (!searchQuery.trim()) return investors;
    const q = searchQuery.toLowerCase();
    return investors.filter((inv) => {
      const name = inv.users?.full_name?.toLowerCase() ?? "";
      const email = inv.users?.email?.toLowerCase() ?? "";
      const org = inv.org_name?.toLowerCase() ?? "";
      return name.includes(q) || email.includes(q) || org.includes(q);
    });
  }, [investors, searchQuery]);

  const statusCounts = React.useMemo(() => {
    const counts = { approved: 0, pending: 0, denied: 0 };
    for (const inv of investors) {
      const s = inv.approval_status;
      if (s === "approved" || s === "auto_approved") counts.approved++;
      else if (s === "pending") counts.pending++;
      else if (s === "denied") counts.denied++;
    }
    return counts;
  }, [investors]);

  const pendingInvestors = React.useMemo(
    () => investors.filter((inv) => inv.approval_status === "pending"),
    [investors]
  );

  async function handleBulkApprove() {
    if (pendingInvestors.length === 0) return;
    setBulkApproving(true);
    try {
      await Promise.all(
        pendingInvestors.map((inv) =>
          fetch(`/api/founder/investors/${inv.id}/approval`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          })
        )
      );
      // Reload page to reflect changes
      window.location.reload();
    } catch {
      setError("Failed to approve all investors. Please try again.");
    } finally {
      setBulkApproving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1" data-onboarding="investors-title">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Investors</h1>
          {!loading && investors.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-bg-elevated px-2.5 py-0.5 text-xs font-medium text-text-secondary">
                {investors.length} total
              </span>
              {statusCounts.approved > 0 && (
                <span className="inline-flex items-center rounded-full bg-[var(--status-success-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-success-text)]">
                  {statusCounts.approved} approved
                </span>
              )}
              {statusCounts.pending > 0 && (
                <span className="inline-flex items-center rounded-full bg-[var(--status-warning-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-warning-text)]">
                  {statusCounts.pending} pending
                </span>
              )}
              {statusCounts.denied > 0 && (
                <span className="inline-flex items-center rounded-full bg-[var(--status-error-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--status-error-text)]">
                  {statusCounts.denied} denied
                </span>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-text-tertiary">
          Control which investors can access your data. Approved investors can see all your submitted metrics and uploaded documents.
        </p>
        <p className="text-xs text-text-muted">
          Access is all-or-nothing — approved investors see everything you submit. You can change access at any time.
        </p>
      </div>

      {pendingInvestors.length >= 2 && (
        <button
          type="button"
          onClick={handleBulkApprove}
          disabled={bulkApproving}
          className="inline-flex items-center gap-1.5 rounded-md bg-btn-primary-bg px-3 py-2 text-sm font-medium text-btn-primary-text hover:bg-btn-primary-hover disabled:opacity-60"
        >
          {bulkApproving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4" />
          )}
          Approve all pending ({pendingInvestors.length})
        </button>
      )}

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-md border border-[var(--status-error-bg)] bg-[var(--status-error-bg)] px-3 py-2 text-sm text-[var(--status-error-text)]">
          {error}
        </div>
      )}

      {!loading && !error && investors.length === 0 && (
        <EmptyState
          icon={Users}
          title="No investors connected yet"
          description="Investors will appear here when they add your company to their portfolio. You'll be able to approve or deny each one before they can see your data. If you were invited by an investor, they'll appear here automatically."
        />
      )}

      {investors.length > 0 && (
        <div className="space-y-4">
          {investors.length >= 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search investors..."
                className="h-11 w-full rounded-md border border-border-default bg-bg-input pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-border-default sm:w-64"
              />
            </div>
          )}

          <div className="space-y-3">
            {filteredInvestors.map((inv) => (
              <InvestorApprovalCard key={inv.id} investor={inv} dataCounts={dataCounts} />
            ))}
            {filteredInvestors.length === 0 && searchQuery && (
              <div className="rounded-xl border border-border-default card-surface p-4 text-sm text-text-tertiary">
                No investors match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

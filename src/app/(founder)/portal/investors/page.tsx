"use client";

import * as React from "react";
import { Search } from "lucide-react";
import { InvestorApprovalCard } from "@/components/founder/investor-approval-card";

type Investor = {
  id: string;
  investor_id: string;
  approval_status: string;
  is_inviting_investor: boolean;
  created_at: string;
  users: {
    id: string;
    email: string;
    full_name: string | null;
  } | null;
};

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 space-y-2">
              <div className="flex gap-2">
                <div className="h-4 w-32 rounded bg-white/10" />
                <div className="h-5 w-20 rounded-full bg-white/5" />
              </div>
              <div className="h-3 w-44 rounded bg-white/5" />
              <div className="h-5 w-16 rounded-full bg-white/10" />
            </div>
            <div className="h-8 w-20 rounded-md bg-white/10" />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FounderInvestorsPage() {
  const [investors, setInvestors] = React.useState<Investor[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [searchQuery, setSearchQuery] = React.useState("");

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/investors");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        setInvestors(json.investors ?? []);
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
      return name.includes(q) || email.includes(q);
    });
  }, [investors, searchQuery]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Investors</h1>
        <p className="text-sm text-white/60">
          Manage which investors can view your metrics. Approve or deny access
          for each investor.
        </p>
        <p className="text-xs text-white/40">
          Approved investors can view your submitted metrics and documents.
        </p>
      </div>

      {loading && <LoadingSkeleton />}

      {error && (
        <div className="rounded-md border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && investors.length === 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="text-sm text-white/60">
            No investors have been linked to your company yet.
          </div>
        </div>
      )}

      {investors.length > 0 && (
        <div className="space-y-4">
          {investors.length >= 4 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search investors..."
                className="h-9 w-full rounded-md border border-white/10 bg-black/30 pl-9 pr-3 text-sm outline-none placeholder:text-white/40 focus:border-white/20 sm:w-64"
              />
            </div>
          )}

          <div className="space-y-3">
            {filteredInvestors.map((inv) => (
              <InvestorApprovalCard key={inv.id} investor={inv} />
            ))}
            {filteredInvestors.length === 0 && searchQuery && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/60">
                No investors match your search.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

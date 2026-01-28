"use client";

import * as React from "react";
import { InvestorApprovalCard } from "@/components/founder/investor-approval-card";

export default function FounderInvestorsPage() {
  const [investors, setInvestors] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/founder/investors");
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? "Failed to load.");
        setInvestors(json.investors ?? []);
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
        <h1 className="text-xl font-semibold tracking-tight">Investors</h1>
        <p className="text-sm text-white/60">
          Manage which investors can view your metrics. Approve or deny access
          for each investor.
        </p>
      </div>

      {loading && (
        <div className="text-sm text-white/60">Loading investors...</div>
      )}

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
        <div className="space-y-3">
          {investors.map((inv) => (
            <InvestorApprovalCard key={inv.id} investor={inv} />
          ))}
        </div>
      )}
    </div>
  );
}

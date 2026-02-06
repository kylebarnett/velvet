"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Pencil, FileText, Calendar } from "lucide-react";

import { PerformanceSummary } from "./performance-summary";
import { InvestmentTable, type InvestmentRow } from "./investment-table";
import { FundPerformanceChart } from "./fund-performance-chart";
import { FundFormModal } from "./fund-form-modal";

type Fund = {
  id: string;
  name: string;
  vintage_year: number;
  fund_size: number | null;
  currency: string;
  created_at: string;
};

type LPReport = {
  id: string;
  fund_id: string;
  report_date: string;
  report_type: string;
  title: string;
  status: string;
  created_at: string;
};

type PerformanceData = {
  tvpi: number | null;
  dpi: number | null;
  rvpi: number | null;
  moic: number | null;
  irr: number | null;
  totalInvested: number;
  totalCurrentValue: number;
  totalRealizedValue: number;
  investmentCount: number;
};

type FundDetailClientProps = {
  fund: Fund;
  investments: InvestmentRow[];
  reports: LPReport[];
  companies: { id: string; name: string }[];
};

export function FundDetailClient({
  fund,
  investments: initialInvestments,
  reports,
  companies,
}: FundDetailClientProps) {
  const router = useRouter();
  const [showEdit, setShowEdit] = useState(false);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [loadingPerf, setLoadingPerf] = useState(true);

  const fetchPerformance = useCallback(async () => {
    setLoadingPerf(true);
    try {
      const res = await fetch(`/api/investors/funds/${fund.id}/performance`);
      if (res.ok) {
        const data = await res.json();
        setPerformance(data);
      }
    } catch {
      // Performance data unavailable
    } finally {
      setLoadingPerf(false);
    }
  }, [fund.id]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  function handleInvestmentRefresh() {
    router.refresh();
    // Re-fetch performance since investments changed
    fetchPerformance();
  }

  function formatCurrency(value: number | null, currency: string): string {
    if (value == null) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-6">
      {/* Fund header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{fund.name}</h1>
          <p className="mt-0.5 text-sm text-white/60">
            Vintage {fund.vintage_year}
            {fund.fund_size != null && (
              <> &middot; {formatCurrency(fund.fund_size, fund.currency)} fund</>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          className="flex h-9 items-center gap-1.5 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit Fund
        </button>
      </div>

      {/* Performance summary */}
      {loadingPerf ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="h-3 w-12 animate-pulse rounded bg-white/10" />
              <div className="mt-2 h-7 w-16 animate-pulse rounded bg-white/10" />
            </div>
          ))}
        </div>
      ) : performance ? (
        <PerformanceSummary
          tvpi={performance.tvpi}
          dpi={performance.dpi}
          rvpi={performance.rvpi}
          irr={performance.irr}
          moic={performance.moic}
          totalInvested={performance.totalInvested}
          totalCurrentValue={performance.totalCurrentValue}
          totalRealizedValue={performance.totalRealizedValue}
          currency={fund.currency}
        />
      ) : null}

      {/* Investment table */}
      <InvestmentTable
        fundId={fund.id}
        investments={initialInvestments}
        companies={companies}
        currency={fund.currency}
        onRefresh={handleInvestmentRefresh}
      />

      {/* Performance chart */}
      {performance && (
        <FundPerformanceChart
          totalInvested={performance.totalInvested}
          totalCurrentValue={performance.totalCurrentValue}
          totalRealizedValue={performance.totalRealizedValue}
          currency={fund.currency}
        />
      )}

      {/* LP Reports section */}
      <div className="rounded-xl border border-white/10 bg-white/5">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3">
          <h3 className="text-sm font-medium text-white/80">LP Reports</h3>
        </div>
        {reports.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-white/40">
            No LP reports yet. Reports can be generated once you have fund investments tracked.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {reports.map((report) => (
              <div
                key={report.id}
                className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]"
              >
                <FileText className="h-4 w-4 shrink-0 text-white/30" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{report.title}</p>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Calendar className="h-3 w-3" />
                    {new Date(report.report_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                    <span>&middot;</span>
                    <span className="capitalize">{report.report_type}</span>
                  </div>
                </div>
                <span
                  className={
                    report.status === "published"
                      ? "rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs text-emerald-200"
                      : "rounded-full bg-amber-500/20 px-2 py-0.5 text-xs text-amber-200"
                  }
                >
                  {report.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit fund modal */}
      <FundFormModal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        onSaved={() => {
          setShowEdit(false);
          router.refresh();
        }}
        mode="edit"
        initialValues={{
          id: fund.id,
          name: fund.name,
          vintage_year: fund.vintage_year,
          fund_size: fund.fund_size,
          currency: fund.currency,
        }}
      />
    </div>
  );
}

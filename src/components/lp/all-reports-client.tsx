"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Calendar, ChevronRight } from "lucide-react";

type FundOption = { id: string; name: string };

type LPReport = {
  id: string;
  fund_id: string;
  fund_name: string;
  report_date: string;
  report_type: string;
  title: string;
  status: string;
  created_at: string;
};

type QuarterOption = {
  label: string;
  year: number;
  quarter: number;
};

function generateQuarters(count: number): QuarterOption[] {
  const now = new Date();
  let year = now.getFullYear();
  let quarter = Math.ceil((now.getMonth() + 1) / 3);
  const quarters: QuarterOption[] = [];

  for (let i = 0; i < count; i++) {
    quarters.push({
      label: `Q${quarter} '${String(year).slice(2)}`,
      year,
      quarter,
    });
    quarter--;
    if (quarter === 0) {
      quarter = 4;
      year--;
    }
  }

  return quarters;
}

function dateInQuarter(dateStr: string, q: QuarterOption): boolean {
  const d = new Date(dateStr + "T00:00:00");
  if (d.getFullYear() !== q.year) return false;
  const month = d.getMonth(); // 0-indexed
  const startMonth = (q.quarter - 1) * 3;
  return month >= startMonth && month < startMonth + 3;
}

export function AllReportsClient({ funds }: { funds: FundOption[] }) {
  const router = useRouter();
  const [reports, setReports] = useState<LPReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [fundFilter, setFundFilter] = useState("");
  const [periodFilter, setPeriodFilter] = useState("");

  const quarters = useMemo(() => generateQuarters(8), []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/investors/lp-reports");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setReports(data.reports ?? []);
        }
      } catch {
        // keep empty
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = reports;
    if (fundFilter) {
      list = list.filter((r) => r.fund_id === fundFilter);
    }
    if (periodFilter) {
      const q = quarters.find((q) => `${q.year}-${q.quarter}` === periodFilter);
      if (q) {
        list = list.filter((r) => dateInQuarter(r.report_date, q));
      }
    }
    return list;
  }, [reports, fundFilter, periodFilter, quarters]);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">LP Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <select
          value={fundFilter}
          onChange={(e) => setFundFilter(e.target.value)}
          className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
        >
          <option value="">All Funds</option>
          {funds.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>

        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="h-11 rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white transition-colors hover:border-white/15 focus:border-white/20 focus:outline-none"
        >
          <option value="">All Periods</option>
          {quarters.map((q) => (
            <option key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
              {q.label}
            </option>
          ))}
        </select>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/[0.04]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-white/10" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 animate-pulse rounded bg-white/10" />
                <div className="h-3 w-32 animate-pulse rounded bg-white/10" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-white/10" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/40">
          {reports.length === 0
            ? "No LP reports yet. Create reports from individual fund pages."
            : "No reports match the selected filters."}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/[0.04]">
          {filtered.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() =>
                router.push(`/lp-reports/${report.fund_id}/reports/${report.id}`)
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
            >
              <FileText className="h-4 w-4 shrink-0 text-white/30" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{report.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-white/40">
                  <span className="rounded-full bg-white/10 px-2 py-0.5 text-white/60">
                    {report.fund_name}
                  </span>
                  <Calendar className="h-3 w-3" />
                  {new Date(report.report_date + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { month: "short", day: "numeric", year: "numeric" },
                  )}
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
              <ChevronRight className="h-4 w-4 shrink-0 text-white/20" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

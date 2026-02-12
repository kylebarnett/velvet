"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { FileText, Calendar, ChevronRight } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

const NONE = "__none__";

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
        <Select
          value={fundFilter || NONE}
          onValueChange={(v) => setFundFilter(v === NONE ? "" : v)}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[160px]">
            <SelectValue placeholder="All Funds" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All Funds</SelectItem>
            {funds.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={periodFilter || NONE}
          onValueChange={(v) => setPeriodFilter(v === NONE ? "" : v)}
        >
          <SelectTrigger size="sm" className="w-auto min-w-[140px]">
            <SelectValue placeholder="All Periods" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>All Periods</SelectItem>
            {quarters.map((q) => (
              <SelectItem key={`${q.year}-${q.quarter}`} value={`${q.year}-${q.quarter}`}>
                {q.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-3">
              <div className="h-4 w-4 animate-pulse rounded bg-bg-hover" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 animate-pulse rounded bg-bg-hover" />
                <div className="h-3 w-32 animate-pulse rounded bg-bg-hover" />
              </div>
              <div className="h-5 w-16 animate-pulse rounded-full bg-bg-hover" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-border-default card-surface px-4 py-8 text-center text-sm text-text-muted">
          {reports.length === 0
            ? "No LP reports yet. Create reports from individual fund pages."
            : "No reports match the selected filters."}
        </div>
      ) : (
        <div className="rounded-xl border border-border-default card-surface divide-y divide-border-subtle">
          {filtered.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() =>
                router.push(`/funds/${report.fund_id}/reports/${report.id}`)
              }
              className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-raised"
            >
              <FileText className="h-4 w-4 shrink-0 text-text-faint" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{report.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted">
                  <span className="rounded-full bg-bg-hover px-2 py-0.5 text-text-tertiary">
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
                    ? "rounded-full bg-[var(--success-bg-muted)] px-2 py-0.5 text-xs text-[var(--status-success-text)]"
                    : "rounded-full bg-[var(--status-warning-bg)] px-2 py-0.5 text-xs text-[var(--status-warning-text)]"
                }
              >
                {report.status}
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-faint" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

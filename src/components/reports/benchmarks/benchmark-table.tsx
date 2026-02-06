"use client";

import { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { getPercentileBgColor } from "@/lib/benchmarks/calculate";
import { formatValue } from "@/components/charts/types";

type CompanyBenchmark = {
  id: string;
  name: string;
  value: number;
  formattedValue: string;
  percentile: number | null;
  industry: string | null;
  stage: string | null;
};

type SortField = "value" | "percentile" | "name" | "delta";
type SortDir = "asc" | "desc";

type BenchmarkTableProps = {
  companies: CompanyBenchmark[];
  medianValue: number | null;
  metricName: string;
};

function formatDelta(value: number, median: number, metricName: string): string {
  const diff = value - median;
  const prefix = diff >= 0 ? "+" : "";
  return prefix + formatValue(diff, metricName);
}

function getDeltaColor(value: number, median: number): string {
  const diff = value - median;
  if (diff > 0) return "text-emerald-400";
  if (diff < 0) return "text-red-400";
  return "text-white/60";
}

export function BenchmarkTable({
  companies,
  medianValue,
  metricName,
}: BenchmarkTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir(field === "name" ? "asc" : "desc");
    }
  };

  const sortedCompanies = useMemo(() => {
    const sorted = [...companies];
    const dir = sortDir === "asc" ? 1 : -1;

    sorted.sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.name.localeCompare(b.name);
        case "value":
          return dir * (a.value - b.value);
        case "percentile":
          return dir * ((a.percentile ?? 0) - (b.percentile ?? 0));
        case "delta":
          if (medianValue === null) return 0;
          return dir * (a.value - medianValue - (b.value - medianValue));
        default:
          return 0;
      }
    });

    return sorted;
  }, [companies, sortField, sortDir, medianValue]);

  function SortIcon({ field }: { field: SortField }) {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 text-white/30" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-white/60" />
    ) : (
      <ArrowDown className="h-3 w-3 text-white/60" />
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="p-4 pb-2">
        <h3 className="text-sm font-medium text-white/80">
          Company Rankings
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06]">
              <th className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/60"
                >
                  Company
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("value")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/60"
                >
                  Value
                  <SortIcon field="value" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("percentile")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/60"
                >
                  Percentile
                  <SortIcon field="percentile" />
                </button>
              </th>
              {medianValue !== null && (
                <th className="px-4 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => toggleSort("delta")}
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/40 transition-colors hover:text-white/60"
                  >
                    vs Median
                    <SortIcon field="delta" />
                  </button>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sortedCompanies.map((company) => (
              <tr
                key={company.id}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.03]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-zinc-50">
                      {company.name}
                    </span>
                    {(company.industry || company.stage) && (
                      <div className="flex items-center gap-1">
                        {company.industry && (
                          <span className="rounded-md bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-200">
                            {company.industry}
                          </span>
                        )}
                        {company.stage && (
                          <span className="rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[10px] text-violet-200">
                            {company.stage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-white/80">
                  {company.formattedValue}
                </td>
                <td className="px-4 py-3 text-right">
                  {company.percentile !== null ? (
                    <span
                      className={cn(
                        "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums",
                        getPercentileBgColor(company.percentile),
                      )}
                    >
                      P{company.percentile}
                    </span>
                  ) : (
                    <span className="text-xs text-white/30">-</span>
                  )}
                </td>
                {medianValue !== null && (
                  <td
                    className={cn(
                      "px-4 py-3 text-right tabular-nums text-sm",
                      getDeltaColor(company.value, medianValue),
                    )}
                  >
                    {formatDelta(company.value, medianValue, metricName)}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {companies.length === 0 && (
        <div className="p-6 text-center text-sm text-white/40">
          No company data to display.
        </div>
      )}
    </div>
  );
}

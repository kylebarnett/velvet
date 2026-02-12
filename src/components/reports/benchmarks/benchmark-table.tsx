"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { ArrowUpDown, ArrowUp, ArrowDown, ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { getPercentileBgColor } from "@/lib/benchmarks/calculate";
import { formatValue } from "@/components/charts/types";
import { ExportButton } from "@/components/ui/export-button";
import { downloadCsv } from "@/lib/utils/csv-export";
import { downloadExcel } from "@/lib/utils/excel-export";

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
  if (diff > 0) return "text-[var(--success-accent)]";
  if (diff < 0) return "text-[var(--error-accent)]";
  return "text-text-tertiary";
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
      return <ArrowUpDown className="h-3 w-3 text-text-faint" />;
    }
    return sortDir === "asc" ? (
      <ArrowUp className="h-3 w-3 text-text-tertiary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-text-tertiary" />
    );
  }

  function getExportData() {
    const headers = ["Company", "Industry", "Stage", "Value", "Percentile", "vs Median"];
    const rows = sortedCompanies.map((c) => [
      c.name,
      c.industry ?? "",
      c.stage ?? "",
      c.formattedValue,
      c.percentile !== null ? `P${c.percentile}` : "",
      medianValue !== null ? formatDelta(c.value, medianValue, metricName) : "",
    ]);
    return { headers, rows };
  }

  function handleExport(format: "csv" | "excel" | "pdf") {
    const { headers, rows } = getExportData();
    const dateStr = new Date().toISOString().split("T")[0];
    const baseName = `benchmarks-${metricName}-${dateStr}`;
    if (format === "excel") {
      downloadExcel({ filename: baseName, headers, rows });
    } else {
      downloadCsv(`${baseName}.csv`, headers, rows);
    }
  }

  return (
    <div className="rounded-xl border border-border-default card-surface">
      <div className="flex items-center justify-between p-4 pb-2">
        <h3 className="text-sm font-medium text-text-primary">
          Company Rankings
        </h3>
        <ExportButton onExport={handleExport} formats={["csv", "excel"]} />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border-subtle">
              <th className="px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => toggleSort("name")}
                  className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-tertiary"
                >
                  Company
                  <SortIcon field="name" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("value")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-tertiary"
                >
                  Value
                  <SortIcon field="value" />
                </button>
              </th>
              <th className="px-4 py-2.5 text-right">
                <button
                  type="button"
                  onClick={() => toggleSort("percentile")}
                  className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-tertiary"
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
                    className="ml-auto flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-text-muted transition-colors hover:text-text-tertiary"
                  >
                    vs Median
                    <SortIcon field="delta" />
                  </button>
                </th>
              )}
              <th className="w-10 px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {sortedCompanies.map((company) => (
              <tr
                key={company.id}
                className="border-b border-border-subtle transition-colors hover:bg-bg-raised"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-text-primary">
                      {company.name}
                    </span>
                    {(company.industry || company.stage) && (
                      <div className="flex items-center gap-1">
                        {company.industry && (
                          <span className="rounded-md bg-[var(--status-info-bg)] px-1.5 py-0.5 text-[10px] text-[var(--status-info-text)]">
                            {company.industry}
                          </span>
                        )}
                        {company.stage && (
                          <span className="rounded-md bg-[var(--tag-violet-bg)] px-1.5 py-0.5 text-[10px] text-[var(--tag-violet-text)]">
                            {company.stage}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-primary">
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
                    <span className="text-xs text-text-faint">-</span>
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
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/dashboard/${company.id}`}
                    className="text-text-faint transition-colors hover:text-text-muted"
                    aria-label={`View ${company.name} dashboard`}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {companies.length === 0 && (
        <div className="p-6 text-center text-sm text-text-muted">
          No company data to display.
        </div>
      )}
    </div>
  );
}

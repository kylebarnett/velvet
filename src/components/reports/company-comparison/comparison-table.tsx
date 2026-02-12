"use client";

import { formatValue, getChartColor } from "@/components/charts/types";
import { ExportButton } from "@/components/ui/export-button";
import { downloadCsv } from "@/lib/utils/csv-export";
import { downloadExcel } from "@/lib/utils/excel-export";
import type { NormalizationMode } from "./normalization-toggle";

type ComparisonTableProps = {
  /** Table data: array of objects with `period` key + one key per company name */
  data: Array<Record<string, string | number | null>>;
  /** Company names as columns */
  companies: string[];
  /** The metric being displayed (for value formatting) */
  metricName: string;
  /** Current normalization mode */
  normalization: NormalizationMode;
};

function formatCellValue(
  value: number | string | null,
  normalization: NormalizationMode,
  metricName: string
): string {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (typeof num !== "number" || isNaN(num)) return "-";

  if (normalization === "percent_change") {
    return `${num >= 0 ? "+" : ""}${num.toFixed(1)}%`;
  }
  if (normalization === "indexed") {
    return num.toFixed(1);
  }
  return formatValue(num, metricName);
}

export function ComparisonTable({
  data,
  companies,
  metricName,
  normalization,
}: ComparisonTableProps) {
  function getExportData() {
    const headers = ["Period", ...companies];
    const rows = data.map((row) => [
      String(row.period ?? ""),
      ...companies.map((c) => {
        const val = row[c];
        if (val === null || val === undefined) return "";
        return String(val);
      }),
    ]);
    return { headers, rows };
  }

  function handleExport(format: "csv" | "excel" | "pdf") {
    const { headers, rows } = getExportData();
    const dateStr = new Date().toISOString().split("T")[0];
    const baseName = `comparison-${metricName}-${dateStr}`;
    if (format === "excel") {
      downloadExcel({ filename: baseName, headers, rows });
    } else {
      downloadCsv(`${baseName}.csv`, headers, rows);
    }
  }

  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-border-default card-surface text-text-muted">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border-default card-surface">
      <div className="flex items-center justify-end px-4 pt-3">
        <ExportButton onExport={handleExport} formats={["csv", "excel"]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border-default">
              <th className="sticky left-0 bg-bg-secondary/80 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                Period
              </th>
              {companies.map((company, index) => (
                <th
                  key={company}
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-tertiary"
                >
                  <span className="flex items-center justify-end gap-2">
                    <span
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ backgroundColor: getChartColor(index) }}
                    />
                    {company}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-bg-raised"
              >
                <td className="sticky left-0 bg-bg-secondary/60 px-4 py-2.5 text-text-secondary">
                  {row.period}
                </td>
                {companies.map((company) => {
                  const val = row[company];
                  return (
                    <td
                      key={company}
                      className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-text-primary"
                    >
                      {formatCellValue(val, normalization, metricName)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

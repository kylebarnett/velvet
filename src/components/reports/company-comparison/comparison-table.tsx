"use client";

import { formatValue } from "@/components/charts/types";
import { getChartColor } from "@/components/charts/types";
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
  if (!data.length) {
    return (
      <div className="flex h-32 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/40">
        No data available
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="sticky left-0 bg-zinc-900/80 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                Period
              </th>
              {companies.map((company, index) => (
                <th
                  key={company}
                  className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/60"
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
          <tbody className="divide-y divide-white/[0.06]">
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                className="transition-colors hover:bg-white/[0.03]"
              >
                <td className="sticky left-0 bg-zinc-900/60 px-4 py-2.5 text-white/70">
                  {row.period}
                </td>
                {companies.map((company) => {
                  const val = row[company];
                  return (
                    <td
                      key={company}
                      className="whitespace-nowrap px-4 py-2.5 text-right tabular-nums text-white/80"
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

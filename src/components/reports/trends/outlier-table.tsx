"use client";

import Link from "next/link";
import { ExportButton } from "@/components/ui/export-button";
import { downloadCsv } from "@/lib/utils/csv-export";
import { downloadExcel } from "@/lib/utils/excel-export";

type Outlier = {
  companyId: string;
  companyName: string;
  growth: number;
  direction: "outperforming" | "underperforming";
};

type OutlierTableProps = {
  outliers: Outlier[];
  metricName: string;
};

export function OutlierTable({ outliers, metricName }: OutlierTableProps) {
  function handleExport(format: "csv" | "excel" | "pdf") {
    const headers = ["Company", "Growth (%)", "Direction"];
    const rows = outliers.map((o) => [
      o.companyName,
      o.growth.toFixed(1),
      o.direction,
    ]);
    const dateStr = new Date().toISOString().split("T")[0];
    const baseName = `outliers-${metricName}-${dateStr}`;
    if (format === "excel") {
      downloadExcel({ filename: baseName, headers, rows });
    } else {
      downloadCsv(`${baseName}.csv`, headers, rows);
    }
  }

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border-subtle bg-gradient-to-br from-bg-elevated to-transparent transition-all duration-300 hover:border-border-default">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-[var(--violet-bg-subtle)] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--tag-violet-bg)] to-[var(--violet-bg-subtle)] ring-1 ring-[var(--violet-border)] text-[var(--tag-violet-text)]">
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-text-primary">Outliers</h3>
            <p className="text-xs text-text-muted">
              Companies with {metricName} growth &gt;2 standard deviations from
              the mean
            </p>
          </div>
          {outliers.length > 0 && <ExportButton onExport={handleExport} formats={["csv", "excel"]} />}
        </div>

        {outliers.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-text-muted">
              No outliers detected. All companies are within normal growth range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Company
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Growth
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Direction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {outliers.map((outlier) => (
                  <tr
                    key={outlier.companyId}
                    className="transition-colors hover:bg-bg-raised"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/dashboard/${outlier.companyId}`}
                        className="text-sm font-medium text-text-primary underline-offset-4 hover:underline"
                      >
                        {outlier.companyName}
                      </Link>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          outlier.growth >= 0
                            ? "text-[var(--success-accent)]"
                            : "text-[var(--error-accent)]"
                        }`}
                      >
                        {outlier.growth >= 0 ? "+" : ""}
                        {outlier.growth.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          outlier.direction === "outperforming"
                            ? "bg-[var(--status-success-bg)] text-[var(--status-success-text)]"
                            : "bg-[var(--status-error-bg)] text-[var(--status-error-text)]"
                        }`}
                      >
                        {outlier.direction === "outperforming" ? (
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 10l7-7m0 0l7 7m-7-7v18"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 14l-7 7m0 0l-7-7m7 7V3"
                            />
                          </svg>
                        )}
                        {outlier.direction === "outperforming"
                          ? "Outperforming"
                          : "Underperforming"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

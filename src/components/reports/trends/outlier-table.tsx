"use client";

import Link from "next/link";

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
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent transition-all duration-300 hover:border-white/[0.12]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-violet-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 ring-1 ring-violet-500/20 text-violet-400">
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
          <div>
            <h3 className="font-semibold text-white">Outliers</h3>
            <p className="text-xs text-white/40">
              Companies with {metricName} growth &gt;2 standard deviations from
              the mean
            </p>
          </div>
        </div>

        {outliers.length === 0 ? (
          <div className="flex h-32 items-center justify-center">
            <p className="text-sm text-white/40">
              No outliers detected. All companies are within normal growth range.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-white/40">
                    Company
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                    Growth
                  </th>
                  <th className="pb-3 text-right text-xs font-medium uppercase tracking-wider text-white/40">
                    Direction
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {outliers.map((outlier) => (
                  <tr
                    key={outlier.companyId}
                    className="transition-colors hover:bg-white/[0.02]"
                  >
                    <td className="py-3 pr-4">
                      <Link
                        href={`/dashboard/${outlier.companyId}`}
                        className="text-sm font-medium text-white underline-offset-4 hover:underline"
                      >
                        {outlier.companyName}
                      </Link>
                    </td>
                    <td className="py-3 text-right">
                      <span
                        className={`text-sm font-semibold tabular-nums ${
                          outlier.growth >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
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
                            ? "bg-emerald-500/20 text-emerald-200"
                            : "bg-red-500/20 text-red-200"
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

"use client";

import { formatValue } from "@/components/charts/types";

type TableRow = {
  metric: string;
  companies: Array<{
    companyId: string;
    companyName: string;
    value: number | null;
    previousValue: number | null;
    change: number | null;
  }>;
};

type ComparisonTableProps = {
  data: TableRow[];
  companies: Array<{ id: string; name: string }>;
};

export function ComparisonTable({ data, companies }: ComparisonTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-center">
        <p className="text-white/60">No common metrics to compare.</p>
        <p className="mt-1 text-sm text-white/40">
          The selected companies don't share any metrics.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
      <table className="w-full">
        <thead>
          <tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-sm font-medium text-white/60">
              Metric
            </th>
            {companies.map((company) => (
              <th
                key={company.id}
                className="px-4 py-3 text-right text-sm font-medium text-white/60"
              >
                {company.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={row.metric}
              className="border-b border-white/5 last:border-0"
            >
              <td className="px-4 py-3 text-sm font-medium">
                {row.metric.charAt(0).toUpperCase() + row.metric.slice(1)}
              </td>
              {companies.map((company) => {
                const companyData = row.companies.find(
                  (c) => c.companyId === company.id
                );
                const value = companyData?.value;
                const change = companyData?.change;

                return (
                  <td key={company.id} className="px-4 py-3 text-right">
                    <div className="text-sm font-medium">
                      {value !== null && value !== undefined
                        ? formatValue(value, row.metric)
                        : "-"}
                    </div>
                    {change !== null && change !== undefined && (
                      <div
                        className={`text-xs ${
                          change >= 0 ? "text-emerald-400" : "text-red-400"
                        }`}
                      >
                        {change >= 0 ? "+" : ""}
                        {change.toFixed(1)}%
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

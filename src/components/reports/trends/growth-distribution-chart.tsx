"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

type GrowthBucket = {
  bucket: string;
  count: number;
};

type GrowthDistributionChartProps = {
  data: GrowthBucket[];
  metricName: string;
  companyCount: number;
};

const BUCKET_COLORS: Record<string, string> = {
  "<-20%": "#ef4444",       // red-500
  "-20% to -10%": "#f87171", // red-400
  "-10% to 0%": "#fca5a5",  // red-300
  "0% to 10%": "#6ee7b7",   // emerald-300
  "10% to 20%": "#34d399",  // emerald-400
  ">20%": "#10b981",        // emerald-500
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 shadow-xl">
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-white">
        {payload[0].value} {payload[0].value === 1 ? "company" : "companies"}
      </p>
    </div>
  );
}

export function GrowthDistributionChart({
  data,
  metricName,
  companyCount,
}: GrowthDistributionChartProps) {
  const hasData = data.some((d) => d.count > 0);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-gradient-to-br from-white/[0.05] to-transparent transition-all duration-300 hover:border-white/[0.12]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-amber-500/[0.05] via-transparent to-transparent" />

      <div className="relative p-5">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/5 ring-1 ring-amber-500/20 text-amber-400">
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
                d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Growth Distribution</h3>
            <p className="text-xs text-white/40">
              {metricName} growth across {companyCount}{" "}
              {companyCount === 1 ? "company" : "companies"}
            </p>
          </div>
        </div>

        {!hasData ? (
          <div className="flex h-64 items-center justify-center">
            <p className="text-sm text-white/40">
              Not enough data to calculate growth distribution. At least two
              periods of data per company are needed.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <RechartsBarChart
              data={data}
              margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.06)"
                vertical={false}
              />
              <XAxis
                dataKey="bucket"
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
                dx={-5}
                width={40}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={60}>
                {data.map((entry) => (
                  <Cell
                    key={entry.bucket}
                    fill={BUCKET_COLORS[entry.bucket] ?? "#6b7280"}
                  />
                ))}
              </Bar>
            </RechartsBarChart>
          </ResponsiveContainer>
        )}

        {/* Legend */}
        {hasData && (
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 border-t border-white/[0.05] pt-3">
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <div className="h-2.5 w-2.5 rounded-sm bg-red-500" />
              <span>Negative growth</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-white/40">
              <div className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />
              <span>Positive growth</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

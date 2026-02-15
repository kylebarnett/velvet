"use client";

type FreshnessData = {
  recent: number;
  aging: number;
  stale: number;
  noData: number;
};

type DataFreshnessCardProps = {
  freshness: FreshnessData;
};

const CATEGORIES: Array<{
  key: keyof FreshnessData;
  label: string;
  dotClass: string;
  description: string;
}> = [
  {
    key: "recent",
    label: "Recent data",
    dotClass: "bg-[var(--status-success-text)]",
    description: "< 90 days",
  },
  {
    key: "aging",
    label: "Aging",
    dotClass: "bg-[var(--status-warning-text)]",
    description: "90–180 days",
  },
  {
    key: "stale",
    label: "Stale",
    dotClass: "bg-[var(--status-error-text)]",
    description: "> 180 days",
  },
  {
    key: "noData",
    label: "No data",
    dotClass: "bg-text-faint",
    description: "No submissions",
  },
];

export function DataFreshnessCard({ freshness }: DataFreshnessCardProps) {
  const total = freshness.recent + freshness.aging + freshness.stale + freshness.noData;
  if (total === 0) return null;

  // Only show categories with non-zero counts
  const visible = CATEGORIES.filter((cat) => freshness[cat.key] > 0);
  if (visible.length === 0) return null;

  return (
    <div className="card-surface flex h-full flex-col rounded-xl border border-border-subtle p-4">
      <h3 className="text-xs font-medium uppercase tracking-wide text-text-muted">
        Data Freshness
      </h3>
      <p className="mb-3 mt-1 text-sm text-text-secondary">
        {freshness.recent + freshness.aging} of {total} companies reporting
      </p>
      <div className="space-y-2.5">
        {visible.map((cat) => {
          const count = freshness[cat.key];
          const pct = Math.round((count / total) * 100);

          return (
            <div key={cat.key} className="flex items-center gap-2.5">
              <span className={`h-2 w-2 flex-shrink-0 rounded-full ${cat.dotClass}`} />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm text-text-secondary">{count} {cat.label.toLowerCase()}</span>
                  <span className="text-xs tabular-nums text-text-muted">{pct}%</span>
                </div>
                {/* Mini bar */}
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-bg-hover">
                  <div
                    className={`h-full rounded-full ${cat.dotClass}`}
                    style={{ width: `${pct}%`, opacity: 0.7 }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-[10px] text-text-faint">
        Based on latest submission date per company
      </p>
    </div>
  );
}

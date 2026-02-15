"use client";

import { cn } from "@/lib/utils/cn";
import { MOCK_REQUESTS } from "./mock-data";

export function MockRequestInbox() {
  return (
    <div
      aria-hidden="true"
      className="card-surface overflow-hidden rounded-lg border border-border-default"
    >
      {/* Header row */}
      <div className="grid grid-cols-[1fr_1.2fr_0.7fr_0.6fr_0.5fr] gap-2 border-b border-border-default bg-bg-secondary px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Investor
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Metrics Requested
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Date
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Status
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Action
        </span>
      </div>

      {/* Rows */}
      {MOCK_REQUESTS.map((req, i) => (
        <div
          key={req.investor}
          className={cn(
            "grid grid-cols-[1fr_1.2fr_0.7fr_0.6fr_0.5fr] items-center gap-2 px-4 py-3",
            i < MOCK_REQUESTS.length - 1 && "border-b border-border-subtle",
          )}
        >
          <span className="text-xs font-medium text-text-primary">
            {req.investor}
          </span>
          <span className="truncate text-xs text-text-secondary">
            {req.metrics}
          </span>
          <span className="text-xs text-text-muted">{req.date}</span>
          <div>
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium",
                req.status === "pending" &&
                  "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
                req.status === "submitted" &&
                  "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
              )}
            >
              {req.status === "pending" ? "Pending" : "Submitted"}
            </span>
          </div>
          <div>
            {req.status === "pending" && (
              <button
                type="button"
                tabIndex={-1}
                className="rounded-md border border-border-default bg-bg-elevated px-2.5 py-1 text-[10px] font-medium text-text-primary transition-colors hover:bg-bg-hover"
              >
                Submit
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

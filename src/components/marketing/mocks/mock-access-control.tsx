"use client";

import { cn } from "@/lib/utils/cn";
import { MOCK_INVESTORS } from "./mock-data";

const STATUS_CONFIG = {
  approved: {
    dotClass: "bg-[var(--data-positive)]",
    label: "Approved",
    labelClass: "text-[var(--data-positive)]",
  },
  pending: {
    dotClass: "bg-[var(--warning-accent)]",
    label: "Pending",
    labelClass: "text-[var(--warning-accent)]",
  },
  denied: {
    dotClass: "bg-[var(--data-negative)]",
    label: "Denied",
    labelClass: "text-[var(--data-negative)]",
  },
} as const;

export function MockAccessControl() {
  return (
    <div
      aria-hidden="true"
      className="card-surface rounded-lg border border-border-default p-5"
    >
      {/* Header */}
      <p className="mb-1 text-sm font-semibold text-text-primary">
        Investor Access
      </p>
      <p className="mb-4 text-xs text-text-muted">
        Control which investors can view your metrics
      </p>

      {/* Investor list */}
      <div className="flex flex-col divide-y divide-border-subtle">
        {MOCK_INVESTORS.map((investor) => {
          const config = STATUS_CONFIG[investor.status];

          return (
            <div
              key={investor.name}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    config.dotClass,
                  )}
                />
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {investor.name}
                  </p>
                  <p className={cn("text-[10px] font-medium", config.labelClass)}>
                    {config.label}
                  </p>
                </div>
              </div>

              <div className="flex gap-1.5">
                {investor.status === "approved" && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="rounded-md border border-border-default px-2.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                  >
                    Deny
                  </button>
                )}
                {investor.status === "pending" && (
                  <>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-md bg-btn-primary-bg px-2.5 py-1 text-[10px] font-medium text-btn-primary-text"
                    >
                      Approve
                    </button>
                    <button
                      type="button"
                      tabIndex={-1}
                      className="rounded-md border border-border-default px-2.5 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover"
                    >
                      Deny
                    </button>
                  </>
                )}
                {investor.status === "denied" && (
                  <button
                    type="button"
                    tabIndex={-1}
                    className="rounded-md bg-btn-primary-bg px-2.5 py-1 text-[10px] font-medium text-btn-primary-text"
                  >
                    Approve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

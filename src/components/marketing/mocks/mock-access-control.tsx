"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { MOCK_INVESTORS } from "./mock-data";

const STATUS_CONFIG = {
  approved: {
    dotClass: "bg-[var(--data-positive)]",
    label: "Approved",
    labelClass: "text-[var(--data-positive)]",
    avatarBg: "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
  },
  pending: {
    dotClass: "bg-[var(--warning-accent)]",
    label: "Pending",
    labelClass: "text-[var(--warning-accent)]",
    avatarBg: "bg-amber-500/20 text-amber-600 dark:text-amber-400",
  },
  denied: {
    dotClass: "bg-[var(--data-negative)]",
    label: "Denied",
    labelClass: "text-[var(--data-negative)]",
    avatarBg: "bg-red-500/20 text-red-600 dark:text-red-400",
  },
} as const;

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.15 },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -10 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

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
      <motion.div
        className="flex flex-col divide-y divide-border-subtle"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
      >
        {MOCK_INVESTORS.map((investor) => {
          const config = STATUS_CONFIG[investor.status];

          return (
            <motion.div
              key={investor.name}
              variants={rowVariants}
              className="flex items-center justify-between py-3"
            >
              <div className="flex items-center gap-3">
                <div className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[9px] font-bold", config.avatarBg)}>
                  {investor.initials}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-primary">
                    {investor.name}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        config.dotClass,
                      )}
                    />
                    <p className={cn("text-[10px] font-medium", config.labelClass)}>
                      {config.label}
                    </p>
                  </div>
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
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
}

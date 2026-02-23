"use client";

import { Check, ChevronDown } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils/cn";

const STEPS = ["Select Metrics", "Choose Companies", "Review & Send"];
const ACTIVE_STEP = 0;

const METRICS = [
  { name: "Revenue", checked: true },
  { name: "ARR", checked: true },
  { name: "Burn Rate", checked: true },
  { name: "Headcount", checked: false },
  { name: "Churn Rate", checked: false },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.08, delayChildren: 0.2 },
  },
};

const rowVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export function MockCampaignWizard() {
  return (
    <div
      aria-hidden="true"
      className="card-surface rounded-lg border border-border-default p-5"
    >
      {/* Step indicator */}
      <div className="mb-5 flex items-center gap-3">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <motion.div
                className={cn(
                  "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
                  i === ACTIVE_STEP
                    ? "bg-accent text-white"
                    : "bg-bg-elevated text-text-muted",
                )}
                {...(i === ACTIVE_STEP
                  ? {
                      animate: { scale: [1, 1.1, 1] },
                      transition: {
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      },
                    }
                  : {})}
              >
                {i + 1}
              </motion.div>
              <span
                className={cn(
                  "text-xs font-medium",
                  i === ACTIVE_STEP
                    ? "text-text-primary"
                    : "text-text-muted",
                )}
              >
                {step}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="h-px w-8 bg-border-default" />
            )}
          </div>
        ))}
      </div>

      {/* Metric checkboxes */}
      <div className="mb-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-text-secondary">
            Metrics
          </span>
          <span className="text-[10px] font-medium text-accent-text">
            Select all
          </span>
        </div>

        <motion.div
          className="flex flex-col gap-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
        >
          {METRICS.map((metric) => (
            <motion.label
              key={metric.name}
              variants={rowVariants}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-bg-hover"
            >
              <div
                className={cn(
                  "flex h-4 w-4 items-center justify-center rounded border",
                  metric.checked
                    ? "border-accent bg-accent"
                    : "border-border-default bg-bg-input",
                )}
              >
                {metric.checked && (
                  <Check className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className={cn(
                  "text-xs",
                  metric.checked
                    ? "text-text-primary"
                    : "text-text-secondary",
                )}
              >
                {metric.name}
              </span>
            </motion.label>
          ))}
        </motion.div>
      </div>

      {/* Period selector */}
      <div className="mb-5">
        <span className="text-xs font-medium text-text-secondary">Period</span>
        <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-md border border-border-default bg-bg-input px-3 py-1.5 text-xs text-text-primary">
          Q1 2026
          <ChevronDown className="h-3 w-3 text-text-muted" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-border-subtle pt-4">
        <span className="text-xs text-text-muted">
          24 companies selected
        </span>
        <button
          type="button"
          className="rounded-lg bg-btn-primary-bg px-4 py-2 text-xs font-medium text-btn-primary-text"
          tabIndex={-1}
        >
          Send Request
        </button>
      </div>
    </div>
  );
}

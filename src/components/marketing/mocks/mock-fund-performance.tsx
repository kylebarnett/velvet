"use client";

import { motion, type Variants } from "framer-motion";
import { AnimatedCounter } from "@/components/marketing/ui/animated-counter";
import { MOCK_FUND_METRICS } from "./mock-data";

const TOP_INVESTMENTS = [
  { name: "Apex Labs", multiple: 3.2 },
  { name: "NovaPay", multiple: 2.8 },
  { name: "CloudHive", multiple: 2.1 },
];

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

function parseMetricValue(val: string): { num: number; suffix: string; decimals: number } {
  if (val.endsWith("x")) {
    return { num: parseFloat(val), suffix: "x", decimals: 1 };
  }
  if (val.endsWith("%")) {
    return { num: parseFloat(val), suffix: "%", decimals: 0 };
  }
  return { num: parseFloat(val), suffix: "", decimals: 1 };
}

export function MockFundPerformance() {
  return (
    <motion.div
      aria-hidden="true"
      className="card-surface rounded-lg border border-border-default p-5"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="mb-4">
        <p className="text-sm font-semibold text-text-primary">
          Fund I &mdash; 2023 Vintage
        </p>
      </motion.div>

      {/* Metric cards */}
      <motion.div variants={itemVariants} className="mb-5 grid grid-cols-4 gap-3">
        {MOCK_FUND_METRICS.map((metric) => {
          const { num, suffix, decimals } = parseMetricValue(metric.value);

          return (
            <div
              key={metric.label}
              className="rounded-md border border-border-subtle bg-bg-secondary p-3 text-center"
            >
              <p className="text-[10px] font-medium uppercase tracking-wide text-text-muted">
                {metric.label}
              </p>
              <p className="mt-1 text-lg font-bold text-text-primary">
                <AnimatedCounter
                  value={num}
                  suffix={suffix}
                  decimals={decimals}
                />
              </p>
            </div>
          );
        })}
      </motion.div>

      {/* Top investments table */}
      <motion.div variants={itemVariants}>
        <p className="mb-2 text-xs font-medium text-text-secondary">
          Top Investments
        </p>
        <div className="overflow-hidden rounded-md border border-border-subtle">
          {TOP_INVESTMENTS.map((inv, i) => (
            <div
              key={inv.name}
              className={`flex items-center justify-between px-3 py-2 text-sm ${
                i % 2 !== 0 ? "bg-bg-elevated" : ""
              }`}
            >
              <span className="text-xs text-text-primary">{inv.name}</span>
              <span className="text-xs font-semibold text-text-primary">
                <AnimatedCounter
                  value={inv.multiple}
                  suffix="x"
                  decimals={1}
                />
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

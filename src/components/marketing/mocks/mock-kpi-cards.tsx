"use client";

import { motion, type Variants } from "framer-motion";
import { cn } from "@/lib/utils/cn";
import { AnimatedCounter } from "@/components/marketing/ui/animated-counter";
import { MOCK_KPIS } from "./mock-data";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export function MockKPICards() {
  return (
    <motion.div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {MOCK_KPIS.map((kpi) => (
        <motion.div
          key={kpi.label}
          variants={cardVariants}
          className="card-surface rounded-lg border border-border-default p-4"
        >
          <p className="text-xs text-text-muted">{kpi.label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary">
            <AnimatedCounter
              value={kpi.value}
              prefix={kpi.prefix ?? ""}
              suffix={kpi.suffix ?? ""}
              decimals={kpi.suffix === "M" ? 1 : 0}
            />
          </p>
          <p
            className={cn(
              "mt-1 text-xs font-medium",
              kpi.positive
                ? "text-[var(--data-positive)]"
                : "text-[var(--data-negative)]",
            )}
          >
            {kpi.change}
          </p>
        </motion.div>
      ))}
    </motion.div>
  );
}

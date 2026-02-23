"use client";

import { motion, type Variants } from "framer-motion";
import { TrendingUp, TrendingDown, Clock } from "lucide-react";
import { MOCK_COMPANIES } from "./mock-data";

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

export function MockCompanyCards() {
  const companies = MOCK_COMPANIES.slice(0, 4);

  return (
    <motion.div
      aria-hidden="true"
      className="grid grid-cols-2 gap-3"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true }}
    >
      {companies.map((company) => {
        const isPositive = company.growth.startsWith("+");

        return (
          <motion.div
            key={company.name}
            variants={cardVariants}
            className="card-surface rounded-lg border border-border-default p-4"
          >
            {/* Company header with avatar */}
            <div className="flex items-center gap-2.5">
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white ${company.avatarColor}`}>
                {company.name.split(" ").map(w => w[0]).join("")}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">
                  {company.name}
                </p>
                <div className="mt-0.5 flex flex-wrap gap-1.5">
                  <span className="rounded-full bg-[var(--tag-blue-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tag-blue-text)]">
                    {company.sector}
                  </span>
                  <span className="rounded-full bg-[var(--tag-violet-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tag-violet-text)]">
                    {company.stage}
                  </span>
                </div>
              </div>
            </div>

            {/* Primary metric: Revenue */}
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-text-muted">Revenue</span>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-medium text-text-primary">
                  {company.revenue}
                </span>
                <div className="flex items-center gap-0.5">
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3 text-[var(--data-positive)]" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-[var(--data-negative)]" />
                  )}
                  <span
                    className={
                      isPositive
                        ? "text-[10px] font-medium text-[var(--data-positive)]"
                        : "text-[10px] font-medium text-[var(--data-negative)]"
                    }
                  >
                    {company.growth}
                  </span>
                </div>
              </div>
            </div>

            {/* Secondary metric: ARR */}
            <div className="mt-1.5 flex items-center justify-between border-t border-border-subtle pt-1.5">
              <span className="text-[10px] text-text-muted">ARR</span>
              <span className="text-xs text-text-secondary">{company.arr}</span>
            </div>

            {/* Freshness */}
            <div className="mt-2 flex items-center gap-1 text-[10px] text-text-faint">
              <Clock className="h-2.5 w-2.5" />
              <span>Updated {company.freshness}</span>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
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
            <p className="text-sm font-semibold text-text-primary">
              {company.name}
            </p>

            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full bg-[var(--tag-blue-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tag-blue-text)]">
                {company.sector}
              </span>
              <span className="rounded-full bg-[var(--tag-violet-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tag-violet-text)]">
                {company.stage}
              </span>
            </div>

            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-xs text-text-muted">Revenue</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm font-medium text-text-primary">
                  {company.revenue}
                </span>
                <span
                  className={
                    isPositive
                      ? "text-xs font-medium text-[var(--data-positive)]"
                      : "text-xs font-medium text-[var(--data-negative)]"
                  }
                >
                  {company.growth}
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

"use client";

import { motion, type Variants } from "framer-motion";
import { MockSidebar } from "./mock-sidebar";
import { MockKPICards } from "./mock-kpi-cards";
import { MockChart } from "./mock-chart";
import { MOCK_COMPANIES } from "./mock-data";
import { TrendingUp, TrendingDown } from "lucide-react";

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 10, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 1.2 },
  },
};

export function MockDashboard() {
  const topCompanies = MOCK_COMPANIES.slice(0, 3);

  return (
    <div
      aria-hidden="true"
      className="flex overflow-hidden rounded-xl border border-border-default"
    >
      {/* Sidebar */}
      <MockSidebar />

      {/* Main content */}
      <div className="flex min-w-0 flex-1 flex-col bg-bg-primary">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-subtle px-6 py-3">
          <div>
            <p className="text-[10px] text-text-muted">Portfolio</p>
            <p className="text-sm font-semibold text-text-primary">Companies</p>
          </div>
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent/20 text-[10px] font-semibold text-accent">
            SC
          </div>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-4 p-5">
          {/* KPI Cards row */}
          <MockKPICards />

          {/* Chart */}
          <div className="card-surface rounded-lg border border-border-default p-4">
            <p className="mb-2 text-xs font-medium text-text-secondary">
              Portfolio ARR
            </p>
            <MockChart />
          </div>

          {/* Mini company cards row */}
          <motion.div
            className="grid grid-cols-3 gap-3"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
          >
            {topCompanies.map((company) => {
              const isPositive = company.growth.startsWith("+");
              return (
                <motion.div
                  key={company.name}
                  variants={cardVariants}
                  className="card-surface rounded-lg border border-border-default p-3"
                >
                  <div className="flex items-center gap-2">
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-bold text-white ${company.avatarColor}`}>
                      {company.name.split(" ").map(w => w[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium text-text-primary">
                        {company.name}
                      </p>
                      <p className="text-[9px] text-text-muted">{company.sector}</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-[10px] text-text-muted">Revenue</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-text-primary">
                        {company.revenue}
                      </span>
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-[var(--data-positive)]" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-[var(--data-negative)]" />
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

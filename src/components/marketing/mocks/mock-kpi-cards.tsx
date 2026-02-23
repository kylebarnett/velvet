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

/** Tiny inline sparkline SVG */
function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const w = 48;
  const h = 16;
  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * w,
    y: h - ((v - min) / range) * h,
  }));
  const d = pts.map((p, i) => (i === 0 ? `M${p.x},${p.y}` : `L${p.x},${p.y}`)).join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="shrink-0">
      <path
        d={d}
        fill="none"
        stroke={positive ? "var(--data-positive)" : "var(--data-negative)"}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

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
      {MOCK_KPIS.map((kpi) => {
        // Burn Rate going down is positive (green), but visually we show the sparkline
        // trending downward to differentiate it from "growth" metrics
        const isBurnRate = kpi.label === "Avg Burn Rate";
        const sparklinePositive = isBurnRate ? true : kpi.positive;

        return (
          <motion.div
            key={kpi.label}
            variants={cardVariants}
            className="card-surface rounded-lg border border-border-default p-4"
          >
            <div className="flex items-start justify-between">
              <p className="text-xs text-text-muted">{kpi.label}</p>
              <Sparkline data={kpi.sparkline} positive={sparklinePositive} />
            </div>
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
              {isBurnRate && (
                <span className="ml-1 font-normal text-text-faint">vs last quarter</span>
              )}
            </p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

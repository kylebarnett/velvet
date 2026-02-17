"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const INVESTORS = [
  { name: "Sequoia Capital", initials: "SC" },
  { name: "Accel Partners", initials: "AP" },
  { name: "Greylock", initials: "GL" },
];

type Status = "pending" | "approved";

export function ApprovalFlowScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [statuses, setStatuses] = useState<Status[]>([
    "pending",
    "pending",
    "pending",
  ]);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setStatuses(["approved", "approved", "pending"]);
      return;
    }

    const t1 = setTimeout(
      () => setStatuses(["approved", "pending", "pending"]),
      600,
    );
    const t2 = setTimeout(
      () => setStatuses(["approved", "approved", "pending"]),
      1600,
    );

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="space-y-2 p-4">
      {INVESTORS.map((inv, i) => (
        <motion.div
          key={inv.name}
          className="flex items-center justify-between rounded-lg border border-border-default bg-bg-primary p-3"
          initial={{ opacity: 0, y: 8 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.3, delay: i * 0.1 }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-bg-elevated text-[10px] font-semibold text-text-secondary">
              {inv.initials}
            </div>
            <span className="text-xs font-medium text-text-primary">
              {inv.name}
            </span>
          </div>

          <motion.span
            className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
              statuses[i] === "approved"
                ? "bg-[var(--data-positive)]/15 text-[var(--data-positive)]"
                : "bg-[var(--warning-accent)]/15 text-[var(--warning-accent)]"
            }`}
            key={statuses[i]}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            {statuses[i] === "approved" ? "Approved" : "Pending"}
          </motion.span>
        </motion.div>
      ))}
    </div>
  );
}

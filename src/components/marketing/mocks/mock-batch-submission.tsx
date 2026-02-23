"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

const METRICS = [
  { name: "Revenue", prev: "$1,800,000", current: "$2,100,000" },
  { name: "ARR", prev: "$7,200,000", current: "$8,400,000" },
  { name: "Burn Rate", prev: "$195,000", current: "$180,000" },
  { name: "Headcount", prev: "42", current: "47" },
  { name: "Churn Rate", prev: "2.4%", current: "2.1%" },
];

function TypewriterValue({
  text,
  delay,
}: {
  text: string;
  delay: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [displayed, setDisplayed] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  useEffect(() => {
    if (!isInView || !text) return;

    if (prefersReducedMotion) {
      const t = setTimeout(() => {
        setDisplayed(text);
        setShowCursor(false);
      }, delay);
      return () => clearTimeout(t);
    }

    let i = 0;
    const startTimer = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(interval);
          // Hide cursor after typing completes
          setTimeout(() => setShowCursor(false), 600);
        }
      }, 40);
      return () => clearInterval(interval);
    }, delay);

    return () => clearTimeout(startTimer);
  }, [isInView, text, delay, prefersReducedMotion]);

  return (
    <span ref={ref}>
      {displayed}
      {showCursor && (
        <span className="inline-block h-4 w-px animate-pulse bg-text-primary" />
      )}
    </span>
  );
}

export function MockBatchSubmission() {
  return (
    <div
      aria-hidden="true"
      className="card-surface overflow-hidden rounded-lg border border-border-default"
    >
      {/* Table header */}
      <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2 bg-bg-secondary px-4 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Metric
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Q3 2025
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
          Q4 2025
        </span>
      </div>

      {/* Rows */}
      {METRICS.map((metric, i) => (
        <motion.div
          key={metric.name}
          className="grid grid-cols-[1.2fr_1fr_1fr] items-center gap-2 border-t border-border-subtle px-4 py-3"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.3, delay: i * 0.08 }}
        >
          <span className="text-xs font-medium text-text-primary">
            {metric.name}
          </span>
          <span className="text-xs text-text-muted">{metric.prev}</span>
          <div className="text-xs font-medium text-text-primary">
            <TypewriterValue
              text={metric.current}
              delay={600 + i * 400}
            />
          </div>
        </motion.div>
      ))}

      {/* Footer */}
      <div className="flex justify-end border-t border-border-default px-4 py-3">
        <button
          type="button"
          tabIndex={-1}
          className="rounded-lg bg-btn-primary-bg px-4 py-2 text-xs font-medium text-btn-primary-text"
        >
          Submit All
        </button>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const METRICS = [
  { name: "Revenue", value: "$2.1M" },
  { name: "ARR", value: "$8.4M" },
  { name: "Burn Rate", value: "$195K" },
];

export function MetricSubmissionScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [displayedValues, setDisplayedValues] = useState<string[]>(
    METRICS.map(() => ""),
  );
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setDisplayedValues(METRICS.map((m) => m.value));
      setSubmitted(true);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function typeMetric(idx: number) {
      if (cancelled || idx >= METRICS.length) {
        if (!cancelled) {
          const t = setTimeout(() => setSubmitted(true), 400);
          timers.push(t);
        }
        return;
      }
      const text = METRICS[idx].value;
      let ci = 0;
      const start = setTimeout(() => {
        const interval = setInterval(() => {
          if (cancelled) { clearInterval(interval); return; }
          ci++;
          setDisplayedValues((prev) => {
            const next = [...prev];
            next[idx] = text.slice(0, ci);
            return next;
          });
          if (ci >= text.length) {
            clearInterval(interval);
            const nextT = setTimeout(() => typeMetric(idx + 1), 250);
            timers.push(nextT);
          }
        }, 50);
      }, 300);
      timers.push(start);
    }

    const init = setTimeout(() => typeMetric(0), 300);
    timers.push(init);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="p-4">
      <div className="rounded-md border border-border-default">
        {/* Header */}
        <div className="grid grid-cols-[1.2fr_1fr] gap-2 bg-bg-secondary px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Metric
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
            Q4 2025
          </span>
        </div>

        {/* Rows */}
        {METRICS.map((metric, i) => (
          <motion.div
            key={metric.name}
            className="grid grid-cols-[1.2fr_1fr] items-center gap-2 border-t border-border-subtle px-3 py-2.5"
            initial={{ opacity: 0 }}
            animate={isInView ? { opacity: 1 } : {}}
            transition={{ duration: 0.3, delay: i * 0.08 }}
          >
            <span className="text-xs font-medium text-text-primary">
              {metric.name}
            </span>
            <span className="text-xs font-medium text-text-primary">
              {displayedValues[i]}
              {displayedValues[i].length > 0 &&
                displayedValues[i].length < metric.value.length && (
                  <span className="inline-block h-3.5 w-px animate-pulse bg-text-primary" />
                )}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Submit button */}
      <div className="mt-3 flex justify-end">
        {submitted ? (
          <motion.div
            className="flex items-center gap-1.5 rounded-lg bg-[var(--data-positive)]/10 px-4 py-2 text-xs font-medium text-[var(--data-positive)]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Check className="h-3.5 w-3.5" />
            Submitted
          </motion.div>
        ) : (
          <div className="rounded-lg bg-btn-primary-bg px-4 py-2 text-xs font-medium text-btn-primary-text opacity-60">
            Submit All
          </div>
        )}
      </div>
    </div>
  );
}

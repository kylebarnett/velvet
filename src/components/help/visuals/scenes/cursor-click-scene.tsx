"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

export function CursorClickScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "moving" | "clicked" | "done">(
    "idle",
  );

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setPhase("done");
      return;
    }

    const t1 = setTimeout(() => setPhase("moving"), 300);
    const t2 = setTimeout(() => setPhase("clicked"), 1000);
    const t3 = setTimeout(() => setPhase("done"), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="relative flex flex-col items-center gap-4 p-6">
      {/* Button */}
      <motion.div
        className="rounded-lg bg-btn-primary-bg px-5 py-2.5 text-xs font-medium text-btn-primary-text"
        animate={
          phase === "clicked"
            ? { scale: [1, 0.95, 1] }
            : {}
        }
        transition={{ duration: 0.2 }}
      >
        Send Request
      </motion.div>

      {/* Ripple */}
      {phase === "clicked" && (
        <motion.div
          className="absolute left-1/2 top-[38px] h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/30"
          initial={{ scale: 0, opacity: 0.8 }}
          animate={{ scale: 4, opacity: 0 }}
          transition={{ duration: 0.5 }}
        />
      )}

      {/* Cursor */}
      {phase !== "done" && phase !== "idle" && (
        <motion.svg
          width="16"
          height="20"
          viewBox="0 0 16 20"
          className="absolute"
          initial={{ x: 60, y: 80 }}
          animate={
            phase === "moving"
              ? { x: 0, y: 30 }
              : { x: 0, y: 30 }
          }
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          <path
            d="M0 0 L0 14 L4 10 L8 18 L10 17 L6 9 L12 9 Z"
            fill="var(--text-primary)"
            stroke="var(--bg-primary)"
            strokeWidth="1"
          />
        </motion.svg>
      )}

      {/* Success */}
      {phase === "done" && (
        <motion.div
          className="flex items-center gap-1.5 text-xs text-[var(--data-positive)]"
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Check className="h-3.5 w-3.5" />
          <span className="font-medium">Request sent successfully</span>
        </motion.div>
      )}
    </div>
  );
}

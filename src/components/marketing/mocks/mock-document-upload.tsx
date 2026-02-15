"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Upload, FileText, CheckCircle2 } from "lucide-react";

const EXTRACTED_VALUES = [
  { label: "Revenue", value: "$2.1M" },
  { label: "ARR", value: "$8.4M" },
  { label: "Burn Rate", value: "$180K" },
];

export function MockDocumentUpload() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "processing" | "extracted">(
    "idle",
  );
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    // Start processing after a short delay
    const processingTimer = setTimeout(() => {
      setPhase("processing");

      if (prefersReducedMotion) {
        setProgress(100);
        setTimeout(() => setPhase("extracted"), 300);
        return;
      }

      // Animate progress
      let p = 0;
      const progressInterval = setInterval(() => {
        p += 2;
        setProgress(Math.min(p, 100));
        if (p >= 100) {
          clearInterval(progressInterval);
          setTimeout(() => setPhase("extracted"), 400);
        }
      }, 30);
    }, 800);

    return () => clearTimeout(processingTimer);
  }, [isInView, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="card-surface rounded-lg border border-border-default p-5"
    >
      {/* Drop zone */}
      <div className="mb-4 flex flex-col items-center justify-center rounded-lg border border-dashed border-border-default p-6">
        <Upload className="mb-2 h-6 w-6 text-text-muted" />
        <p className="text-xs font-medium text-text-secondary">
          Drag &amp; drop your documents
        </p>
        <p className="mt-0.5 text-[10px] text-text-muted">
          or click to browse
        </p>
      </div>

      {/* Processing state */}
      {phase !== "idle" && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="rounded-md border border-border-subtle bg-bg-secondary p-3"
        >
          <div className="mb-2 flex items-center gap-2">
            <FileText className="h-4 w-4 text-accent" />
            <span className="text-xs font-medium text-text-primary">
              Q4_Financial_Report.pdf
            </span>
          </div>

          {/* Progress bar */}
          {phase === "processing" && (
            <div className="mb-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${progress}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="mt-1 text-[10px] text-text-muted">
                Analyzing document...
              </p>
            </div>
          )}

          {/* Extracted values */}
          {phase === "extracted" && (
            <div className="mt-2 flex flex-col gap-2">
              <p className="text-[10px] font-medium text-text-muted">
                Extracted Values
              </p>
              {EXTRACTED_VALUES.map((item, i) => (
                <motion.div
                  key={item.label}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.15 }}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--data-positive)]" />
                  <span className="text-xs text-text-secondary">
                    {item.label}:
                  </span>
                  <span className="text-xs font-semibold text-text-primary">
                    {item.value}
                  </span>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}

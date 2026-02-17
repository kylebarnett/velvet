"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FileText, CheckCircle2 } from "lucide-react";

export function FileUploadScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "uploading" | "complete">("idle");
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setPhase("complete");
      setProgress(100);
      return;
    }

    const t1 = setTimeout(() => {
      setPhase("uploading");
      let p = 0;
      const interval = setInterval(() => {
        p += 3;
        setProgress(Math.min(p, 100));
        if (p >= 100) {
          clearInterval(interval);
          setTimeout(() => setPhase("complete"), 300);
        }
      }, 30);
    }, 400);

    return () => clearTimeout(t1);
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="p-4">
      <motion.div
        className="rounded-lg border border-border-default bg-bg-primary p-3"
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex items-center gap-2.5">
          <FileText className="h-5 w-5 text-[var(--accent)]" />
          <div className="flex-1">
            <p className="text-xs font-medium text-text-primary">
              Q4_Report.pdf
            </p>
            <p className="text-[10px] text-text-muted">2.4 MB</p>
          </div>
          {phase === "complete" && (
            <motion.div
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3 }}
            >
              <CheckCircle2 className="h-4.5 w-4.5 text-[var(--data-positive)]" />
            </motion.div>
          )}
        </div>

        {phase === "uploading" && (
          <div className="mt-2.5">
            <div className="h-1.5 overflow-hidden rounded-full bg-bg-elevated">
              <motion.div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-1 text-right text-[10px] text-text-muted">
              {progress}%
            </p>
          </div>
        )}

        {phase === "complete" && (
          <motion.p
            className="mt-2 text-[10px] font-medium text-[var(--data-positive)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            Upload complete
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

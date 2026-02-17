"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FileText, Sparkles } from "lucide-react";

type Status = "draft" | "review" | "published";

const STATUS_CONFIG: Record<
  Status,
  { label: string; bg: string; text: string }
> = {
  draft: {
    label: "Draft",
    bg: "bg-bg-elevated",
    text: "text-text-muted",
  },
  review: {
    label: "In Review",
    bg: "bg-[var(--warning-accent)]/15",
    text: "text-[var(--warning-accent)]",
  },
  published: {
    label: "Published",
    bg: "bg-[var(--data-positive)]/15",
    text: "text-[var(--data-positive)]",
  },
};

export function StatusChangeScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [status, setStatus] = useState<Status>("draft");

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setStatus("published");
      return;
    }

    const t1 = setTimeout(() => setStatus("review"), 800);
    const t2 = setTimeout(() => setStatus("published"), 2000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isInView, prefersReducedMotion]);

  const config = STATUS_CONFIG[status];

  return (
    <div ref={ref} className="flex justify-center p-5">
      <motion.div
        className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-primary px-4 py-3"
        initial={{ opacity: 0, y: 8 }}
        animate={isInView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <FileText className="h-5 w-5 text-text-secondary" />
        <div>
          <p className="text-xs font-medium text-text-primary">
            Q4 Tear Sheet
          </p>
          <p className="text-[10px] text-text-muted">Updated 2 min ago</p>
        </div>
        <motion.span
          key={status}
          className={`ml-2 flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${config.bg} ${config.text}`}
          initial={{ opacity: 0, scale: 0.7 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3, type: "spring", stiffness: 300 }}
        >
          {status === "published" && (
            <Sparkles className="h-2.5 w-2.5" />
          )}
          {config.label}
        </motion.span>
      </motion.div>
    </div>
  );
}

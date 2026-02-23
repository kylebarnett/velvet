"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Share2, Link as LinkIcon } from "lucide-react";

const COMPANY_METRICS = [
  { label: "Revenue", value: "$2.1M" },
  { label: "ARR", value: "$8.4M" },
  { label: "Headcount", value: "47" },
  { label: "Burn Rate", value: "$180K" },
];

const SHARE_LINK = "velvet.app/s/apex-labs-q4";

export function MockTearSheet() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [showLink, setShowLink] = useState(false);
  const [linkText, setLinkText] = useState("");

  useEffect(() => {
    if (!isInView) return;

    const showTimer = setTimeout(() => {
      setShowLink(true);

      if (prefersReducedMotion) {
        setLinkText(SHARE_LINK);
        return;
      }

      let i = 0;
      const interval = setInterval(() => {
        i++;
        setLinkText(SHARE_LINK.slice(0, i));
        if (i >= SHARE_LINK.length) clearInterval(interval);
      }, 35);
    }, 1800);

    return () => clearTimeout(showTimer);
  }, [isInView, prefersReducedMotion]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="card-surface rounded-lg border border-border-default p-5"
    >
      {/* Company header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-xs font-bold text-white">
            AL
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">Apex Labs</p>
            <div className="mt-0.5 flex items-center gap-1.5">
              <span className="rounded-full bg-[var(--tag-blue-bg)] px-2 py-0.5 text-[10px] font-medium text-[var(--tag-blue-text)]">
                AI/ML
              </span>
              <span className="text-[10px] text-text-faint">Q4 2025</span>
            </div>
          </div>
        </div>
        <motion.button
          type="button"
          tabIndex={-1}
          className="flex items-center gap-1.5 rounded-md border border-border-default px-2.5 py-1.5 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-hover"
          whileInView={{ scale: [1, 1.05, 1] }}
          viewport={{ once: true }}
          transition={{ delay: 1.2, duration: 0.4 }}
        >
          <Share2 className="h-3 w-3" />
          Share
        </motion.button>
      </div>

      {/* Metrics grid */}
      <div className="mb-4 grid grid-cols-2 gap-3">
        {COMPANY_METRICS.map((metric, i) => (
          <motion.div
            key={metric.label}
            className="rounded-md border border-border-subtle bg-bg-secondary p-3"
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.2 + i * 0.1 }}
          >
            <p className="text-[10px] text-text-muted">{metric.label}</p>
            <p className="mt-0.5 text-sm font-semibold text-text-primary">
              {metric.value}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Share link */}
      {showLink && (
        <motion.div
          className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-secondary px-3 py-2"
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          transition={{ duration: 0.3 }}
        >
          <LinkIcon className="h-3 w-3 shrink-0 text-accent" />
          <span className="text-xs text-accent-text">
            {linkText}
            {linkText.length < SHARE_LINK.length && (
              <span className="ml-px inline-block h-3 w-px animate-pulse bg-accent" />
            )}
          </span>
        </motion.div>
      )}
    </div>
  );
}

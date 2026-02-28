"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Link2, Check } from "lucide-react";

const DEFAULT_URL = "postsig.app/r/q4-report";

export function ShareLinkScene({
  buttonText = "Share Report",
  url = DEFAULT_URL,
}: {
  buttonText?: string;
  url?: string;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "typing" | "copied">("idle");
  const [displayedUrl, setDisplayedUrl] = useState("");

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setPhase("copied");
      setDisplayedUrl(url);
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    const t1 = setTimeout(() => {
      setPhase("typing");
      let ci = 0;
      const interval = setInterval(() => {
        if (cancelled) { clearInterval(interval); return; }
        ci++;
        setDisplayedUrl(url.slice(0, ci));
        if (ci >= url.length) {
          clearInterval(interval);
          const t2 = setTimeout(() => setPhase("copied"), 500);
          timers.push(t2);
        }
      }, 35);
    }, 500);
    timers.push(t1);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isInView, prefersReducedMotion, url]);

  return (
    <div ref={ref} className="flex flex-col items-center gap-3 p-5">
      {/* Share button */}
      <motion.div
        className="flex items-center gap-1.5 rounded-lg bg-btn-primary-bg px-4 py-2 text-xs font-medium text-btn-primary-text"
        animate={phase !== "idle" ? { scale: [1, 0.95, 1] } : {}}
        transition={{ duration: 0.2 }}
      >
        <Link2 className="h-3.5 w-3.5" />
        {buttonText}
      </motion.div>

      {/* URL field */}
      {phase !== "idle" && (
        <motion.div
          className="flex w-full max-w-[240px] items-center gap-2 rounded-md border border-border-default bg-bg-input px-2.5 py-2"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <Link2 className="h-3 w-3 shrink-0 text-text-muted" />
          <span className="flex-1 truncate text-xs text-text-primary">
            {displayedUrl}
            {phase === "typing" && displayedUrl.length < url.length && (
              <span className="inline-block h-3.5 w-px animate-pulse bg-text-primary" />
            )}
          </span>
          {phase === "copied" && (
            <motion.span
              className="flex items-center gap-1 text-[10px] font-medium text-[var(--data-positive)]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              <Check className="h-3 w-3" />
              Copied
            </motion.span>
          )}
        </motion.div>
      )}
    </div>
  );
}

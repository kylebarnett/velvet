"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { FileSpreadsheet, CheckCircle2 } from "lucide-react";

const ROWS = [
  { name: "Acme Corp", email: "alice@acme.co" },
  { name: "Bolt Labs", email: "bob@bolt.io" },
  { name: "Nova AI", email: "carol@nova.ai" },
];

export function CsvImportScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [phase, setPhase] = useState<"idle" | "dropping" | "processing" | "done">(
    "idle",
  );

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setPhase("done");
      return;
    }

    const t1 = setTimeout(() => setPhase("dropping"), 300);
    const t2 = setTimeout(() => setPhase("processing"), 1000);
    const t3 = setTimeout(() => setPhase("done"), 1600);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="p-4">
      {/* Drop zone */}
      <div
        className={`relative mb-3 flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors ${
          phase === "dropping"
            ? "border-[var(--accent)] bg-accent/5"
            : "border-border-default"
        }`}
      >
        {/* Dropping file */}
        {(phase === "dropping" || phase === "idle") && (
          <motion.div
            initial={{ y: -30, opacity: 0 }}
            animate={
              phase === "dropping"
                ? { y: 0, opacity: 1 }
                : { y: -30, opacity: 0 }
            }
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <FileSpreadsheet className="h-8 w-8 text-[var(--accent)]" />
          </motion.div>
        )}

        {phase === "processing" && (
          <motion.div
            className="flex items-center gap-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <span className="text-[10px] text-text-muted">Processing...</span>
          </motion.div>
        )}

        {phase === "done" && (
          <motion.div
            className="flex items-center gap-1.5"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2 }}
          >
            <CheckCircle2 className="h-4 w-4 text-[var(--data-positive)]" />
            <span className="text-[10px] font-medium text-text-primary">
              3 companies imported
            </span>
          </motion.div>
        )}

        {phase === "idle" && (
          <p className="mt-1 text-[10px] text-text-muted">
            Drop CSV file here
          </p>
        )}
      </div>

      {/* Imported rows */}
      {phase === "done" && (
        <div className="rounded-md border border-border-default">
          <div className="grid grid-cols-2 gap-2 border-b border-border-subtle bg-bg-secondary px-3 py-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Company
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wide text-text-muted">
              Email
            </span>
          </div>
          {ROWS.map((row, i) => (
            <motion.div
              key={row.name}
              className="grid grid-cols-2 gap-2 border-b border-border-subtle px-3 py-2 last:border-b-0"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: i * 0.1 }}
            >
              <span className="text-xs font-medium text-text-primary">
                {row.name}
              </span>
              <span className="text-xs text-text-secondary">{row.email}</span>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { motion, useReducedMotion } from "framer-motion";

const COLUMNS = ["Company", "Revenue", "Growth"];
const ROWS = [
  ["Acme Corp", "$2.1M", "+18%"],
  ["Bolt Labs", "$890K", "+24%"],
  ["Nova AI", "$3.4M", "+12%"],
  ["Orion Tech", "$1.6M", "+31%"],
];

export function TablePopulateScene() {
  const prefersReducedMotion = useReducedMotion();
  const dur = prefersReducedMotion ? 0 : undefined;

  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-md border border-border-default">
        {/* Header */}
        <div className="grid grid-cols-3 gap-2 bg-bg-secondary px-3 py-2">
          {COLUMNS.map((col) => (
            <span
              key={col}
              className="text-[10px] font-semibold uppercase tracking-wide text-text-muted"
            >
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {ROWS.map((row, i) => (
          <motion.div
            key={i}
            className="grid grid-cols-3 gap-2 border-t border-border-subtle px-3 py-2.5"
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: dur ?? 0.3,
              delay: dur === 0 ? 0 : 0.3 + i * 0.12,
            }}
          >
            <span className="text-xs font-medium text-text-primary">
              {row[0]}
            </span>
            <span className="text-xs text-text-secondary">{row[1]}</span>
            <span
              className={`text-xs font-medium ${
                row[2].startsWith("+")
                  ? "text-[var(--data-positive)]"
                  : "text-[var(--data-negative)]"
              }`}
            >
              {row[2]}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

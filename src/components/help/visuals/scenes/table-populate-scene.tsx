"use client";

import { motion, useReducedMotion } from "framer-motion";

const DEFAULT_COLUMNS = ["Company", "Revenue", "Growth"];
const DEFAULT_ROWS = [
  ["Acme Corp", "$2.1M", "+18%"],
  ["Bolt Labs", "$890K", "+24%"],
  ["Nova AI", "$3.4M", "+12%"],
  ["Orion Tech", "$1.6M", "+31%"],
];

export function TablePopulateScene({
  columns = DEFAULT_COLUMNS,
  rows = DEFAULT_ROWS,
}: {
  columns?: string[];
  rows?: string[][];
} = {}) {
  const prefersReducedMotion = useReducedMotion();
  const dur = prefersReducedMotion ? 0 : undefined;

  const gridStyle = { gridTemplateColumns: `repeat(${columns.length}, minmax(0, 1fr))` };

  return (
    <div className="p-4">
      <div className="overflow-hidden rounded-md border border-border-default">
        {/* Header */}
        <div className="grid gap-2 bg-bg-secondary px-3 py-2" style={gridStyle}>
          {columns.map((col) => (
            <span
              key={col}
              className="text-[10px] font-semibold uppercase tracking-wide text-text-muted"
            >
              {col}
            </span>
          ))}
        </div>

        {/* Rows */}
        {rows.map((row, i) => (
          <motion.div
            key={i}
            className="grid gap-2 border-t border-border-subtle px-3 py-2.5"
            style={gridStyle}
            initial={{ opacity: 0, y: 6 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{
              duration: dur ?? 0.3,
              delay: dur === 0 ? 0 : 0.3 + i * 0.12,
            }}
          >
            {row.map((cell, j) => (
              <span
                key={j}
                className={`text-xs ${
                  j === 0
                    ? "font-medium text-text-primary"
                    : j === row.length - 1 && (cell.startsWith("+") || cell.startsWith("-"))
                      ? `font-medium ${cell.startsWith("+") ? "text-[var(--data-positive)]" : "text-[var(--data-negative)]"}`
                      : "text-text-secondary"
                }`}
              >
                {cell}
              </span>
            ))}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

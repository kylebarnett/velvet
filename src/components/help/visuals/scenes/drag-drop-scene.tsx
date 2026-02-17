"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { GripVertical } from "lucide-react";

const INITIAL_ITEMS = [
  { id: "revenue", label: "Revenue", value: "$2.1M" },
  { id: "arr", label: "ARR", value: "$8.4M" },
  { id: "burn", label: "Burn Rate", value: "$195K" },
];

export function DragDropScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [items, setItems] = useState(INITIAL_ITEMS);
  const [liftedId, setLiftedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setItems([INITIAL_ITEMS[1], INITIAL_ITEMS[0], INITIAL_ITEMS[2]]);
      return;
    }

    // Lift the first card
    const t1 = setTimeout(() => setLiftedId("revenue"), 500);
    // Swap positions
    const t2 = setTimeout(() => {
      setItems([INITIAL_ITEMS[1], INITIAL_ITEMS[0], INITIAL_ITEMS[2]]);
    }, 1200);
    // Drop
    const t3 = setTimeout(() => setLiftedId(null), 1400);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="p-4">
      <div className="space-y-2">
        {items.map((item) => (
          <motion.div
            key={item.id}
            layout
            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-shadow ${
              liftedId === item.id
                ? "border-[var(--accent)] bg-bg-elevated shadow-lg"
                : "border-border-default bg-bg-primary"
            }`}
            animate={
              liftedId === item.id
                ? { scale: 1.03, y: -2 }
                : { scale: 1, y: 0 }
            }
            transition={{
              layout: { type: "spring", stiffness: 350, damping: 28 },
              scale: { duration: 0.2 },
            }}
          >
            <GripVertical className="h-3 w-3 text-text-muted" />
            <span className="flex-1 text-xs font-medium text-text-primary">
              {item.label}
            </span>
            <span className="text-xs text-text-secondary">{item.value}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

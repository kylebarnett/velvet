"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

const DEFAULT_FIELDS = [
  { label: "Company Name", value: "Acme Corp" },
  { label: "Email", value: "hello@acme.co" },
  { label: "Revenue", value: "$2,100,000" },
];

export function FormFillScene({
  fields = DEFAULT_FIELDS,
}: {
  fields?: Array<{ label: string; value: string }>;
} = {}) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [activeField, setActiveField] = useState(-1);
  const [displayedValues, setDisplayedValues] = useState<string[]>(
    fields.map(() => ""),
  );

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setActiveField(fields.length);
      setDisplayedValues(fields.map((f) => f.value));
      return;
    }

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];

    function typeField(fieldIndex: number) {
      if (cancelled || fieldIndex >= fields.length) {
        if (!cancelled) setActiveField(fields.length);
        return;
      }
      setActiveField(fieldIndex);
      const text = fields[fieldIndex].value;
      let charIndex = 0;

      const startDelay = setTimeout(() => {
        const interval = setInterval(() => {
          if (cancelled) {
            clearInterval(interval);
            return;
          }
          charIndex++;
          setDisplayedValues((prev) => {
            const next = [...prev];
            next[fieldIndex] = text.slice(0, charIndex);
            return next;
          });
          if (charIndex >= text.length) {
            clearInterval(interval);
            const nextDelay = setTimeout(
              () => typeField(fieldIndex + 1),
              300,
            );
            timers.push(nextDelay);
          }
        }, 45);
      }, 400);
      timers.push(startDelay);
    }

    const initial = setTimeout(() => typeField(0), 300);
    timers.push(initial);

    return () => {
      cancelled = true;
      timers.forEach(clearTimeout);
    };
  }, [isInView, prefersReducedMotion, fields]);

  return (
    <div ref={ref} className="p-4">
      <div className="space-y-3">
        {fields.map((field, i) => {
          const isActive = activeField === i;
          const isComplete =
            displayedValues[i] === field.value && activeField > i;

          return (
            <motion.div
              key={field.label}
              initial={{ opacity: 0, y: 6 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
            >
              <label className="mb-1 block text-[10px] font-medium text-text-muted">
                {field.label}
              </label>
              <div
                className={`flex h-8 items-center rounded-md border px-2.5 text-xs transition-colors ${
                  isActive
                    ? "border-[var(--accent)] bg-bg-input"
                    : "border-border-default bg-bg-input"
                }`}
              >
                <span className="flex-1 text-text-primary">
                  {displayedValues[i]}
                  {isActive && displayedValues[i].length < field.value.length && (
                    <span className="inline-block h-3.5 w-px animate-pulse bg-text-primary" />
                  )}
                </span>
                {isComplete && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Check className="h-3.5 w-3.5 text-[var(--data-positive)]" />
                  </motion.span>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

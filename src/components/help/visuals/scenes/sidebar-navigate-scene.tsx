"use client";

import { useEffect, useState, useRef } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";
import {
  LayoutDashboard,
  Briefcase,
  Send,
  BarChart3,
  FileText,
} from "lucide-react";

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Briefcase, label: "Companies" },
  { icon: Send, label: "Requests" },
  { icon: BarChart3, label: "Reports" },
  { icon: FileText, label: "Documents" },
];

const SEQUENCE = [0, 2, 3];

export function SidebarNavigateScene() {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true });
  const prefersReducedMotion = useReducedMotion();
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!isInView) return;

    if (prefersReducedMotion) {
      setActiveIndex(SEQUENCE[SEQUENCE.length - 1]);
      return;
    }

    let step = 0;
    setActiveIndex(SEQUENCE[0]);

    const interval = setInterval(() => {
      step++;
      if (step >= SEQUENCE.length) {
        clearInterval(interval);
        return;
      }
      setActiveIndex(SEQUENCE[step]);
    }, 800);

    return () => clearInterval(interval);
  }, [isInView, prefersReducedMotion]);

  return (
    <div ref={ref} className="p-4">
      <div className="w-40 rounded-lg border border-border-default bg-bg-primary">
        {/* Brand */}
        <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-accent text-[8px] font-bold text-white">
            V
          </div>
          <span className="text-xs font-semibold text-text-primary">
            Velvet
          </span>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col gap-0.5 p-1.5">
          {NAV_ITEMS.map((item, i) => {
            const Icon = item.icon;
            const isActive = i === activeIndex;

            return (
              <div
                key={item.label}
                className="relative flex items-center gap-2 rounded-md px-2.5 py-1.5"
              >
                {isActive && (
                  <motion.div
                    layoutId="sidebar-nav-highlight"
                    className="absolute inset-0 rounded-md bg-bg-elevated"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
                <Icon
                  className={`relative z-10 h-3 w-3 ${
                    isActive ? "text-text-primary" : "text-text-muted"
                  }`}
                />
                <span
                  className={`relative z-10 text-[11px] ${
                    isActive
                      ? "font-medium text-text-primary"
                      : "text-text-muted"
                  }`}
                >
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="sidebar-nav-indicator"
                    className="absolute left-0 top-1/2 h-3 w-0.5 -translate-y-1/2 rounded-full bg-accent"
                    transition={{
                      type: "spring",
                      stiffness: 350,
                      damping: 30,
                    }}
                  />
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

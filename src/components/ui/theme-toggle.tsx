"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, useCallback } from "react";
import { Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MODES = [
  { value: "light", icon: Sun, label: "Light" },
  { value: "system", icon: Monitor, label: "System" },
  { value: "dark", icon: Moon, label: "Dark" },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const handleSetTheme = useCallback(
    (value: string) => {
      setTheme(value);
      // Persist to DB for cross-device and per-user sync
      fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme", value }),
      }).catch(() => {
        // Silently fail — localStorage still works as fallback
      });
    },
    [setTheme],
  );

  if (!mounted) {
    return (
      <div className="flex h-8 items-center gap-0.5 rounded-lg bg-bg-elevated p-0.5">
        {MODES.map((m) => (
          <div key={m.value} className="h-7 w-7 rounded-md" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex h-8 items-center gap-0.5 rounded-lg bg-bg-elevated p-0.5">
      {MODES.map((m) => {
        const Icon = m.icon;
        const active = theme === m.value;
        return (
          <button
            key={m.value}
            onClick={() => handleSetTheme(m.value)}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              active
                ? "bg-bg-hover text-text-primary shadow-sm"
                : "text-text-muted hover:text-text-secondary"
            )}
            type="button"
            aria-label={`${m.label} theme`}
            title={m.label}
          >
            <Icon className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}

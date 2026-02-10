"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2, Circle, X, ChevronDown } from "lucide-react";

type ChecklistItem = {
  id: string;
  label: string;
  description: string;
  href: string;
  completed: boolean;
};

type GettingStartedChecklistProps = {
  role: "investor" | "founder";
  items: ChecklistItem[];
};

export function GettingStartedChecklist({ role, items }: GettingStartedChecklistProps) {
  const [dismissed, setDismissed] = React.useState(false);
  const [collapsed, setCollapsed] = React.useState(false);

  // Check localStorage on mount for dismissal
  React.useEffect(() => {
    const key = `velvet_checklist_dismissed_${role}`;
    if (localStorage.getItem(key) === "true") {
      setDismissed(true);
    }
  }, [role]);

  function handleDismiss() {
    const key = `velvet_checklist_dismissed_${role}`;
    localStorage.setItem(key, "true");
    setDismissed(true);
    // Also persist to user preferences for cross-device
    fetch("/api/user/preferences", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: `checklist_dismissed_${role}`, value: true }),
    }).catch(() => {});
  }

  const completedCount = items.filter((i) => i.completed).length;
  const allComplete = completedCount === items.length;

  if (dismissed || allComplete) return null;

  const progressPercent = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  return (
    <div className="rounded-xl border border-border-subtle bg-gradient-to-br from-bg-raised to-transparent">
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-medium text-text-primary">Getting Started</h3>
          <span className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px] font-medium text-text-tertiary">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${collapsed ? "" : "rotate-180"}`} />
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-secondary"
            aria-label="Dismiss checklist"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mx-4 mb-2">
        <div className="h-1 w-full rounded-full bg-bg-hover">
          <div
            className="h-1 rounded-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-1">
          {items.map((item) => (
            <Link
              key={item.id}
              href={item.href}
              className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                item.completed
                  ? "opacity-60"
                  : "hover:bg-bg-elevated"
              }`}
            >
              {item.completed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
              )}
              <div className="min-w-0">
                <span className={`text-sm ${item.completed ? "line-through text-text-muted" : "font-medium text-text-primary"}`}>
                  {item.label}
                </span>
                <p className="mt-0.5 text-xs text-text-muted">{item.description}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

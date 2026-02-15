"use client";

import {
  LayoutDashboard,
  Briefcase,
  Send,
  BarChart3,
  FileText,
  Sparkles,
  Landmark,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MOCK_SIDEBAR_NAV } from "./mock-data";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  "layout-dashboard": LayoutDashboard,
  briefcase: Briefcase,
  send: Send,
  "bar-chart-3": BarChart3,
  "file-text": FileText,
  sparkles: Sparkles,
  landmark: Landmark,
};

export function MockSidebar() {
  return (
    <div
      aria-hidden="true"
      className="flex w-48 shrink-0 flex-col border-r border-border-default bg-bg-sidebar"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold text-text-primary">Velvet</span>
      </div>

      {/* Navigation */}
      <nav className="mt-1 flex flex-col gap-0.5 px-2">
        {MOCK_SIDEBAR_NAV.map((item) => {
          const Icon = ICON_MAP[item.icon];
          const isActive = item.label === "Dashboard";

          return (
            <div
              key={item.label}
              className={cn(
                "relative flex items-center gap-2.5 rounded-md px-3 py-2 text-xs transition-colors",
                isActive
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-tertiary",
              )}
            >
              {isActive && (
                <div className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-accent" />
              )}
              {Icon && <Icon className="h-3.5 w-3.5" />}
              <span>{item.label}</span>
            </div>
          );
        })}
      </nav>
    </div>
  );
}

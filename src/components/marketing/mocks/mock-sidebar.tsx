"use client";

import {
  Briefcase,
  Building2,
  Users,
  Send,
  FileSpreadsheet,
  BarChart3,
  FileText,
  Landmark,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { MOCK_SIDEBAR_NAV, type MockNavItem } from "./mock-data";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  briefcase: Briefcase,
  building2: Building2,
  users: Users,
  send: Send,
  "file-spreadsheet": FileSpreadsheet,
  "bar-chart-3": BarChart3,
  "file-text": FileText,
  landmark: Landmark,
};

const ACTIVE_ITEM = "Companies";

function NavIcon({ name, className }: { name?: string; className?: string }) {
  if (!name) return null;
  const Icon = ICON_MAP[name];
  return Icon ? <Icon className={className} /> : null;
}

function NavItemRow({ item, isChild }: { item: MockNavItem; isChild?: boolean }) {
  const isActive = item.label === ACTIVE_ITEM;

  return (
    <div
      className={cn(
        "relative flex items-center gap-2 rounded-md px-2.5 transition-colors",
        isChild ? "h-6 pl-7 text-[10px]" : "h-7 text-xs",
        isActive
          ? "bg-bg-elevated text-text-primary before:absolute before:inset-y-1 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
          : "text-text-tertiary",
      )}
    >
      <NavIcon name={item.icon} className={isChild ? "h-3 w-3" : "h-3.5 w-3.5"} />
      <span>{item.label}</span>
    </div>
  );
}

export function MockSidebar() {
  return (
    <div
      aria-hidden="true"
      className="flex w-44 shrink-0 flex-col border-r border-border-default bg-bg-sidebar"
    >
      {/* Brand */}
      <div className="flex items-center gap-2.5 px-4 py-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">
          V
        </div>
        <span className="text-sm font-semibold text-text-primary">Velvet</span>
      </div>

      {/* Navigation */}
      <nav className="mt-1 flex flex-1 flex-col gap-0.5 px-2">
        {MOCK_SIDEBAR_NAV.map((item) => {
          const hasChildren = item.children && item.children.length > 0;

          return (
            <div key={item.label}>
              {item.divider && (
                <div className="mx-1 my-1.5 border-t border-border-subtle" />
              )}

              {hasChildren ? (
                <>
                  {/* Group header */}
                  <div className="flex items-center gap-2 rounded-md px-2.5 h-7 text-xs text-text-tertiary">
                    <NavIcon name={item.icon} className="h-3.5 w-3.5" />
                    <span>{item.label}</span>
                    <ChevronDown className="ml-auto h-3 w-3 text-text-faint rotate-180" />
                  </div>
                  {/* Children */}
                  <div className="ml-[13px] border-l border-border-subtle">
                    {item.children!.map((child) => (
                      <NavItemRow key={child.label} item={child} isChild />
                    ))}
                  </div>
                </>
              ) : (
                <NavItemRow item={item} />
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom section — user profile only (settings is behind profile click) */}
      <div className="border-t border-border-subtle px-2 py-3">
        <div className="flex items-center gap-2.5 px-3">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/20 text-[9px] font-semibold text-accent">
            SC
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-medium text-text-primary">Sarah Chen</p>
            <p className="text-[9px] text-text-muted">Investor</p>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-white/10 bg-white/5 p-6 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-white/5 p-3">
          <Icon className="h-6 w-6 text-white/40" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-medium text-white">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-white/60">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

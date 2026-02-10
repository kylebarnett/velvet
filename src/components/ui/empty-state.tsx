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
        "flex flex-col items-center justify-center rounded-xl border border-border-default bg-bg-elevated p-6 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-3 rounded-full bg-bg-elevated p-3">
          <Icon className="h-6 w-6 text-text-muted" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-sm font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-sm text-sm text-text-tertiary">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

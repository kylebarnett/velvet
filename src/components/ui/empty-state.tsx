"use client";

import { cn } from "@/lib/utils/cn";

type EmptyStateVariant = "inline" | "first-use";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
}

export function EmptyState({
  title,
  description,
  action,
  className,
  variant = "first-use",
}: EmptyStateProps) {
  if (variant === "inline") {
    return (
      <div role="status" className={cn("py-12 text-center", className)}>
        <p className="text-sm text-text-secondary">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  // first-use variant: left-aligned, no icon circle, no bordered box
  return (
    <div role="status" className={cn("py-8", className)}>
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-lg text-sm text-text-secondary">
          {description}
        </p>
      )}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

"use client";

import { cn } from "@/lib/utils/cn";

export type StatusBadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "info"
  | "neutral";

export type StatusBadgeSize = "sm" | "md";

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  size?: StatusBadgeSize;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  success: "bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  warning: "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  error: "bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
  info: "bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
  neutral: "bg-bg-hover text-text-secondary",
};

const sizeStyles: Record<StatusBadgeSize, string> = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2 py-0.5 text-[11px]",
};

export function StatusBadge({
  variant,
  size = "md",
  children,
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {children}
    </span>
  );
}

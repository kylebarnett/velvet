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
  success: "bg-emerald-500/20 text-emerald-200",
  warning: "bg-amber-500/20 text-amber-200",
  error: "bg-red-500/20 text-red-200",
  info: "bg-blue-500/20 text-blue-200",
  neutral: "bg-white/10 text-white/70",
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

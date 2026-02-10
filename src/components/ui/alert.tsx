"use client";

import { cn } from "@/lib/utils/cn";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";

export type AlertVariant = "error" | "success" | "warning" | "info";

interface AlertProps {
  variant: AlertVariant;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
}

const variantStyles: Record<AlertVariant, string> = {
  error: "border-[var(--status-error-bg)] bg-[var(--status-error-bg)] text-[var(--status-error-text)]",
  success: "border-[var(--status-success-bg)] bg-[var(--status-success-bg)] text-[var(--status-success-text)]",
  warning: "border-[var(--status-warning-bg)] bg-[var(--status-warning-bg)] text-[var(--status-warning-text)]",
  info: "border-[var(--status-info-bg)] bg-[var(--status-info-bg)] text-[var(--status-info-text)]",
};

const iconMap: Record<AlertVariant, React.ElementType> = {
  error: AlertCircle,
  success: CheckCircle2,
  warning: AlertTriangle,
  info: Info,
};

export function Alert({
  variant,
  children,
  className,
  showIcon = false,
}: AlertProps) {
  const Icon = iconMap[variant];

  return (
    <div
      role="alert"
      className={cn(
        "rounded-md border px-3 py-2 text-sm",
        variantStyles[variant],
        className
      )}
    >
      {showIcon ? (
        <div className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

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
  error: "border-red-500/20 bg-red-500/10 text-red-200",
  success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/20 bg-amber-500/10 text-amber-200",
  info: "border-blue-500/20 bg-blue-500/10 text-blue-200",
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
          <Icon className="mt-0.5 h-4 w-4 shrink-0" />
          <div>{children}</div>
        </div>
      ) : (
        children
      )}
    </div>
  );
}

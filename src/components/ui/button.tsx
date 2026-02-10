import * as React from "react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover focus-visible:ring-[var(--ring-focus)]",
  secondary:
    "border border-border-default bg-bg-elevated text-text-primary hover:bg-bg-hover focus-visible:ring-[var(--ring-focus)]",
  danger:
    "bg-red-500 text-white hover:bg-red-600 focus-visible:ring-red-500/50",
  ghost:
    "text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:ring-[var(--ring-focus)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150",
          "focus:outline-none focus-visible:ring-2",
          "active:scale-[0.98]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

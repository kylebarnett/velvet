import * as React from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "warning" | "ghost";
type ButtonSize = "sm" | "md" | "lg" | "icon-sm" | "icon" | "icon-lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-btn-primary-bg text-btn-primary-text hover:bg-btn-primary-hover focus-visible:ring-[var(--ring-focus)]",
  secondary:
    "border border-border-default bg-bg-elevated text-text-primary hover:bg-bg-hover focus-visible:ring-[var(--ring-focus)]",
  danger:
    "bg-[var(--error-solid)] text-white hover:bg-[var(--error-accent)] focus-visible:ring-[var(--error-ring)]",
  warning:
    "bg-[var(--status-warning-bg)] text-[var(--status-warning-text)] hover:bg-[var(--warning-bg-subtle)] focus-visible:ring-[var(--ring-focus)]",
  ghost:
    "text-text-secondary hover:bg-bg-elevated hover:text-text-primary focus-visible:ring-[var(--ring-focus)]",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  "icon-sm": "h-7 w-7 p-0",
  icon: "h-8 w-8 p-0",
  "icon-lg": "h-9 w-9 p-0",
};

const spinnerSizeClasses: Record<ButtonSize, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-4 w-4",
  "icon-sm": "h-3 w-3",
  icon: "h-3.5 w-3.5",
  "icon-lg": "h-4 w-4",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", loading, className, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
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
      >
        {loading && <Loader2 className={cn("animate-spin", spinnerSizeClasses[size])} />}
        {children}
      </button>
    );
  },
);

Button.displayName = "Button";

interface ButtonLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ href, variant = "primary", size = "md", className, children, ...props }, ref) => {
    return (
      <Link
        ref={ref}
        href={href}
        className={cn(
          "inline-flex items-center justify-center rounded-md font-medium transition-all duration-150",
          "focus:outline-none focus-visible:ring-2",
          "active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {children}
      </Link>
    );
  },
);

ButtonLink.displayName = "ButtonLink";

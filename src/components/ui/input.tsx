import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-md border border-border-default bg-bg-input px-3 text-sm text-text-primary outline-none transition-shadow duration-150",
          "placeholder:text-text-muted",
          "focus:border-accent focus:ring-2 focus:ring-[var(--ring-focus)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-md border border-border-default bg-bg-input px-3 py-2 text-sm text-text-primary outline-none transition-shadow duration-150",
          "placeholder:text-text-muted",
          "focus:border-accent focus:ring-2 focus:ring-[var(--ring-focus)]",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

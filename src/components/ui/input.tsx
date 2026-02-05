import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 text-sm text-white outline-none",
          "placeholder:text-white/40",
          "focus:border-white/20",
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
          "w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none",
          "placeholder:text-white/40",
          "focus:border-white/20",
          "disabled:opacity-60 disabled:cursor-not-allowed",
          className,
        )}
        {...props}
      />
    );
  },
);

Textarea.displayName = "Textarea";

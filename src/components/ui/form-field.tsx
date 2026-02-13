import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface FormFieldProps {
  label: string;
  htmlFor?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, error, required, children, className }: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label
        htmlFor={htmlFor}
        className="block text-xs font-medium text-text-tertiary"
      >
        {label}
        {required && <span className="text-[var(--error-accent)]"> *</span>}
      </label>
      {children}
      {error && (
        <p className="text-xs text-[var(--error-accent)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

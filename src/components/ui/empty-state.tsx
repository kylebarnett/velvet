"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EmptyStateVariant = "inline" | "first-use" | "no-results";

interface EmptyStateLink {
  label: string;
  href: string;
}

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  variant?: EmptyStateVariant;
  icon?: React.ElementType;
  links?: EmptyStateLink[];
}

export function EmptyState({
  title,
  description,
  action,
  className,
  variant = "first-use",
  icon: Icon,
  links,
}: EmptyStateProps) {
  if (variant === "no-results") {
    const ResultIcon = Icon ?? Search;
    return (
      <div role="status" className={cn("flex flex-col items-center py-12 text-center", className)}>
        <ResultIcon className="h-8 w-8 text-text-faint" aria-hidden="true" />
        <p className="mt-3 text-sm font-medium text-text-secondary">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  if (variant === "inline") {
    return (
      <div role="status" className={cn("py-12 text-center", className)}>
        {Icon && <Icon className="mx-auto mb-3 h-8 w-8 text-text-faint" aria-hidden="true" />}
        <p className="text-sm text-text-secondary">{title}</p>
        {description && (
          <p className="mt-1 text-xs text-text-muted">{description}</p>
        )}
        {links && links.length > 0 && (
          <div className="mt-2 flex items-center justify-center gap-3">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-xs text-[var(--accent-text)] hover:underline"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
        {action && <div className="mt-3">{action}</div>}
      </div>
    );
  }

  // first-use variant: left-aligned, no icon circle, no bordered box
  return (
    <div role="status" className={cn("py-8", className)}>
      {Icon && <Icon className="mb-3 h-8 w-8 text-text-faint" aria-hidden="true" />}
      <h3 className="text-base font-medium text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 max-w-lg text-sm text-text-secondary">
          {description}
        </p>
      )}
      {links && links.length > 0 && (
        <div className="mt-2 flex gap-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--accent-text)] hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
      {action && <div className="mt-4 flex gap-2">{action}</div>}
    </div>
  );
}

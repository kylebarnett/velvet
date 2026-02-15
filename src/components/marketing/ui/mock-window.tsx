"use client";

import { cn } from "@/lib/utils/cn";

type MockWindowProps = {
  children: React.ReactNode;
  title?: string;
  className?: string;
};

export function MockWindow({ children, title, className }: MockWindowProps) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border-default shadow-xl",
        className,
      )}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-border-subtle bg-bg-secondary px-4 py-3">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-red-400" aria-hidden="true" />
          <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" aria-hidden="true" />
          <div className="h-2.5 w-2.5 rounded-full bg-green-400" aria-hidden="true" />
        </div>
        {title && (
          <span className="flex-1 text-center text-xs text-text-muted">
            {title}
          </span>
        )}
      </div>

      {/* Content area */}
      <div className="bg-bg-primary">{children}</div>
    </div>
  );
}

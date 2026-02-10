"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-muted">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-3 w-3 text-text-faint" aria-hidden="true" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-text-secondary transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "text-text-tertiary" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

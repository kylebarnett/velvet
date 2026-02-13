"use client";

import Link from "next/link";
import { ChevronRight, MoreHorizontal } from "lucide-react";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

function BreadcrumbLink({ item, isLast }: { item: BreadcrumbItem; isLast: boolean }) {
  if (item.href && !isLast) {
    return (
      <Link href={item.href} className="hover:text-text-secondary transition-colors">
        {item.label}
      </Link>
    );
  }
  return <span className={isLast ? "text-text-tertiary" : ""}>{item.label}</span>;
}

function Separator() {
  return <ChevronRight className="h-3 w-3 shrink-0 text-text-faint" aria-hidden="true" />;
}

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const truncate = items.length > 3;

  if (!truncate) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-muted">
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <Separator />}
            <BreadcrumbLink item={item} isLast={i === items.length - 1} />
          </span>
        ))}
      </nav>
    );
  }

  const first = items[0];
  const middle = items.slice(1, -1);
  const last = items[items.length - 1];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-xs text-text-muted">
      {/* First item — always visible */}
      <span className="flex items-center gap-1">
        <BreadcrumbLink item={first} isLast={false} />
      </span>

      {/* Mobile: ellipsis */}
      <span className="flex items-center gap-1 sm:hidden" aria-hidden="true">
        <Separator />
        <MoreHorizontal className="h-3 w-3 text-text-faint" />
      </span>

      {/* Desktop: middle items */}
      {middle.map((item, i) => (
        <span key={i} className="hidden items-center gap-1 sm:flex">
          <Separator />
          <BreadcrumbLink item={item} isLast={false} />
        </span>
      ))}

      {/* Last item — always visible */}
      <span className="flex items-center gap-1">
        <Separator />
        <BreadcrumbLink item={last} isLast />
      </span>
    </nav>
  );
}

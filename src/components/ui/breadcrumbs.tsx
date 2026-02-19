"use client";

import Link from "next/link";
import {
  Briefcase,
  Building2,
  HelpCircle,
  Landmark,
  LayoutDashboard,
  MoreHorizontal,
  Send,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  briefcase: Briefcase,
  building2: Building2,
  "help-circle": HelpCircle,
  landmark: Landmark,
  "layout-dashboard": LayoutDashboard,
  send: Send,
};

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
  return <span className={isLast ? "font-medium text-text-primary" : ""}>{item.label}</span>;
}

function Separator() {
  return <span className="text-text-faint" aria-hidden="true">/</span>;
}

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  icon?: string;
};

export function Breadcrumbs({ items, icon }: BreadcrumbsProps) {
  const Icon = icon ? ICON_MAP[icon] : undefined;
  const truncate = items.length > 3;

  if (!truncate) {
    return (
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-muted">
        {Icon && <Icon className="h-4 w-4 shrink-0 text-text-faint" aria-hidden="true" />}
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
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
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-text-muted">
      {Icon && <Icon className="h-4 w-4 shrink-0 text-text-faint" aria-hidden="true" />}

      {/* First item — always visible */}
      <span className="flex items-center gap-1.5">
        <BreadcrumbLink item={first} isLast={false} />
      </span>

      {/* Mobile: ellipsis */}
      <span className="flex items-center gap-1.5 sm:hidden" aria-hidden="true">
        <Separator />
        <MoreHorizontal className="h-3.5 w-3.5 text-text-faint" />
      </span>

      {/* Desktop: middle items */}
      {middle.map((item, i) => (
        <span key={i} className="hidden items-center gap-1.5 sm:flex">
          <Separator />
          <BreadcrumbLink item={item} isLast={false} />
        </span>
      ))}

      {/* Last item — always visible */}
      <span className="flex items-center gap-1.5">
        <Separator />
        <BreadcrumbLink item={last} isLast />
      </span>
    </nav>
  );
}

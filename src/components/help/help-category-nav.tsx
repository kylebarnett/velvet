"use client";

import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { HelpCategory } from "@/lib/help/types";

export function HelpCategoryNav({
  categories,
  activeCategory,
  onSelect,
  linkBasePath,
}: {
  categories: HelpCategory[];
  activeCategory: string | null;
  onSelect?: (slug: string | null) => void;
  linkBasePath?: string;
}) {
  const itemClass = (active: boolean) =>
    cn(
      "flex w-full items-center rounded-md px-3 py-2 text-sm transition-colors",
      active
        ? "bg-bg-elevated text-text-primary font-medium"
        : "text-text-secondary hover:bg-bg-elevated hover:text-text-primary",
    );

  if (linkBasePath) {
    return (
      <nav className="space-y-0.5">
        <Link href={linkBasePath} className={itemClass(activeCategory === null)}>
          All Topics
        </Link>
        {categories.map((cat) => (
          <Link
            key={`${cat.role}-${cat.slug}`}
            href={`${linkBasePath}?category=${cat.slug}`}
            className={itemClass(activeCategory === cat.slug)}
          >
            {cat.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav className="space-y-0.5">
      <button
        type="button"
        onClick={() => onSelect?.(null)}
        className={itemClass(activeCategory === null)}
      >
        All Topics
      </button>
      {categories.map((cat) => (
        <button
          key={`${cat.role}-${cat.slug}`}
          type="button"
          onClick={() => onSelect?.(cat.slug)}
          className={itemClass(activeCategory === cat.slug)}
        >
          {cat.label}
        </button>
      ))}
    </nav>
  );
}

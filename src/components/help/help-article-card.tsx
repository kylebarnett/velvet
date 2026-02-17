"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { HelpArticle } from "@/lib/help/types";

export function HelpArticleCard({
  article,
  href,
  onClick,
}: {
  article: HelpArticle;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-bg-raised p-3 transition-colors hover:bg-bg-elevated">
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-medium text-text-primary">
          {article.title}
        </h3>
        <p className="mt-0.5 truncate text-xs text-text-muted">
          {article.description}
        </p>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-text-faint" />
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="w-full text-left">
        {content}
      </button>
    );
  }

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

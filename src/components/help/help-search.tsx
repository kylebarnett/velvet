"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { searchArticles } from "@/lib/help/search";
import { HelpArticleCard } from "./help-article-card";
import type { HelpArticle } from "@/lib/help/types";

export function HelpSearch({
  articles,
  onSelectArticle,
  helpBasePath,
}: {
  articles: HelpArticle[];
  onSelectArticle?: (slug: string) => void;
  helpBasePath?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<HelpArticle[]>([]);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (query.trim()) {
        setResults(searchArticles(query, articles));
      } else {
        setResults([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query, articles]);

  return (
    <div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-faint" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help articles..."
          className="h-11 w-full rounded-md border border-border-default bg-bg-input pl-10 pr-9 text-sm text-text-primary outline-none placeholder:text-text-faint focus:border-[var(--ring-focus)]"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-secondary"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="mt-3 space-y-2">
          {results.length > 0 ? (
            results.map((article) => (
              <HelpArticleCard
                key={article.slug}
                article={article}
                href={
                  !onSelectArticle && helpBasePath
                    ? `${helpBasePath}/${article.slug}`
                    : undefined
                }
                onClick={
                  onSelectArticle
                    ? () => onSelectArticle(article.slug)
                    : undefined
                }
              />
            ))
          ) : (
            <p className="py-4 text-center text-sm text-text-muted">
              No articles found for &ldquo;{query}&rdquo;
            </p>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import * as React from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";
import { ALL_ARTICLES } from "@/lib/help/content";
import { getCategoriesForRole } from "@/lib/help/categories";
import {
  getArticlesByRole,
  getArticlesByCategory,
  type HelpArticle,
} from "@/lib/help/types";
import { HelpSearch } from "./help-search";
import { HelpArticleCard } from "./help-article-card";
import { HelpCategoryNav } from "./help-category-nav";

export function HelpPageContent({
  role,
  helpBasePath,
}: {
  role: "investor" | "founder";
  helpBasePath: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryParam = searchParams.get("category");

  const [activeCategory, setActiveCategory] = React.useState<string | null>(
    categoryParam,
  );

  // Sync state when URL search params change (e.g. navigating from article page)
  React.useEffect(() => {
    setActiveCategory(categoryParam);
  }, [categoryParam]);

  const handleCategorySelect = React.useCallback(
    (slug: string | null) => {
      setActiveCategory(slug);
      if (slug) {
        router.replace(`${helpBasePath}?category=${slug}`, { scroll: false });
      } else {
        router.replace(helpBasePath, { scroll: false });
      }
    },
    [helpBasePath, router],
  );

  const roleArticles = React.useMemo(
    () => getArticlesByRole(role, ALL_ARTICLES),
    [role],
  );

  const categories = React.useMemo(() => getCategoriesForRole(role), [role]);

  const displayedArticles = React.useMemo(() => {
    if (activeCategory) {
      return getArticlesByCategory(activeCategory, roleArticles);
    }
    return roleArticles;
  }, [activeCategory, roleArticles]);

  // Group articles by category when showing all
  const groupedArticles = React.useMemo(() => {
    if (activeCategory) return null;
    const groups: { category: { slug: string; label: string }; articles: HelpArticle[] }[] = [];
    for (const cat of categories) {
      const catArticles = getArticlesByCategory(cat.slug, roleArticles);
      if (catArticles.length > 0) {
        groups.push({ category: cat, articles: catArticles });
      }
    }
    return groups;
  }, [activeCategory, categories, roleArticles]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Help Guide
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Learn how to use every feature of the platform.
        </p>
      </div>

      {/* Search */}
      <HelpSearch articles={roleArticles} helpBasePath={helpBasePath} />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Category sidebar */}
        <div className="w-full shrink-0 lg:w-56">
          <div className="sticky top-6 rounded-xl border border-border-default bg-bg-raised p-3">
            <HelpCategoryNav
              categories={categories}
              activeCategory={activeCategory}
              onSelect={handleCategorySelect}
            />
          </div>
        </div>

        {/* Articles */}
        <div className="min-w-0 flex-1">
          {groupedArticles ? (
            <div className="space-y-8">
              {groupedArticles.map((group) => (
                <div key={group.category.slug}>
                  <h2 className="mb-3 text-lg font-semibold text-text-primary">
                    {group.category.label}
                  </h2>
                  <div className={cn(
                    "grid gap-3",
                    "grid-cols-1 sm:grid-cols-2",
                  )}>
                    {group.articles.map((article) => (
                      <HelpArticleCard
                        key={article.slug}
                        article={article}
                        href={`${helpBasePath}/${article.slug}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
              {displayedArticles.map((article) => (
                <HelpArticleCard
                  key={article.slug}
                  article={article}
                  href={`${helpBasePath}/${article.slug}`}
                />
              ))}
              {displayedArticles.length === 0 && (
                <p className="col-span-2 py-8 text-center text-sm text-text-muted">
                  No articles in this category yet.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

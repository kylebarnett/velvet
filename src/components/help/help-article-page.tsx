"use client";

import * as React from "react";
import { ALL_ARTICLES } from "@/lib/help/content";
import { getCategoriesForRole } from "@/lib/help/categories";
import { getArticlesByRole, type HelpArticle } from "@/lib/help/types";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { HelpArticleRenderer } from "./help-article";
import { HelpCategoryNav } from "./help-category-nav";

export function HelpArticlePage({
  slug,
  role,
  helpBasePath,
}: {
  slug: string;
  role: "investor" | "founder";
  helpBasePath: string;
}) {
  const roleArticles = React.useMemo(
    () => getArticlesByRole(role, ALL_ARTICLES),
    [role],
  );

  const categories = React.useMemo(() => getCategoriesForRole(role), [role]);

  const article = roleArticles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <div className="space-y-4">
        <Breadcrumbs
          icon="help-circle"
          items={[
            { label: "Help", href: helpBasePath },
            { label: "Not Found" },
          ]}
        />
        <p className="py-12 text-center text-sm text-text-muted">
          Article not found.
        </p>
      </div>
    );
  }

  const categoryLabel =
    categories.find((c) => c.slug === article.category)?.label ??
    article.category;

  const relatedArticles = article.relatedArticles
    .map((relSlug) => roleArticles.find((a) => a.slug === relSlug))
    .filter((a): a is HelpArticle => a !== undefined);

  return (
    <div className="space-y-4">
      <Breadcrumbs
        icon="help-circle"
        items={[
          { label: "Help", href: helpBasePath },
          { label: categoryLabel, href: helpBasePath },
          { label: article.title },
        ]}
      />

      <div className="flex flex-col gap-6 lg:flex-row">
        {/* Category sidebar */}
        <div className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-6 rounded-xl border border-border-default bg-bg-raised p-3">
            <HelpCategoryNav
              categories={categories}
              activeCategory={article.category}
              linkBasePath={helpBasePath}
            />
          </div>
        </div>

        {/* Article content */}
        <div className="min-w-0 flex-1 rounded-xl border border-border-default bg-bg-raised p-6">
          <HelpArticleRenderer
            article={article}
            relatedArticles={relatedArticles}
            helpBasePath={helpBasePath}
          />
        </div>
      </div>
    </div>
  );
}

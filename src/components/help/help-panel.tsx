"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { X, ArrowLeft, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { ALL_ARTICLES, getArticlesForRoute } from "@/lib/help/content";
import { getCategoriesForRole } from "@/lib/help/categories";
import { getArticlesByRole, getArticlesByCategory } from "@/lib/help/types";
import type { HelpArticle } from "@/lib/help/types";
import { HelpSearch } from "./help-search";
import { HelpArticleCard } from "./help-article-card";
import { HelpArticleRenderer } from "./help-article";

type PanelView =
  | { type: "home" }
  | { type: "category"; slug: string }
  | { type: "article"; slug: string };

export function HelpPanel({
  open,
  onClose,
  role,
  initialArticle,
}: {
  open: boolean;
  onClose: () => void;
  role: "investor" | "founder";
  initialArticle?: string;
}) {
  const pathname = usePathname();
  const [view, setView] = React.useState<PanelView>(
    initialArticle ? { type: "article", slug: initialArticle } : { type: "home" },
  );
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  // Reset to home or initial article when panel opens
  React.useEffect(() => {
    if (open) {
      setView(
        initialArticle
          ? { type: "article", slug: initialArticle }
          : { type: "home" },
      );
    }
  }, [open, initialArticle]);

  // Escape key to close
  React.useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  // Focus trap
  React.useEffect(() => {
    if (!open || !panelRef.current) return;
    const panel = panelRef.current;
    const focusable = panel.querySelectorAll<HTMLElement>(
      'button, [href], input, [tabindex]:not([tabindex="-1"])',
    );
    if (focusable.length > 0) focusable[0].focus();

    function onTab(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    document.addEventListener("keydown", onTab);
    return () => document.removeEventListener("keydown", onTab);
  }, [open, view]);

  const roleArticles = React.useMemo(
    () => getArticlesByRole(role, ALL_ARTICLES),
    [role],
  );

  const categories = React.useMemo(() => getCategoriesForRole(role), [role]);

  const suggestedArticles = React.useMemo(
    () => getArticlesForRoute(pathname, role),
    [pathname, role],
  );

  const helpBasePath = role === "founder" ? "/portal/help" : "/help";

  function navigateToArticle(slug: string) {
    setView({ type: "article", slug });
  }

  function goBack() {
    if (view.type === "article") {
      // Try to go back to the category this article belongs to
      const article = roleArticles.find((a) => a.slug === view.slug);
      if (article) {
        setView({ type: "category", slug: article.category });
      } else {
        setView({ type: "home" });
      }
    } else {
      setView({ type: "home" });
    }
  }

  if (!mounted) return null;

  const portal = createPortal(
    <>
      <div
        className={cn(
          "fixed inset-0 z-[var(--z-overlay)] bg-bg-backdrop transition-opacity duration-200",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Help guide"
        className={cn(
          "fixed inset-y-0 right-0 z-[var(--z-modal)] flex w-full flex-col border-l border-border-default bg-bg-primary shadow-2xl transition-transform duration-300 ease-in-out sm:w-96",
          open ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-border-default px-4 py-3">
          <div className="flex items-center gap-2">
            {view.type !== "home" && (
              <button
                type="button"
                onClick={goBack}
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
                aria-label="Go back"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-text-primary">
              {view.type === "home" && "Help Guide"}
              {view.type === "category" &&
                (categories.find((c) => c.slug === view.slug)?.label ??
                  "Category")}
              {view.type === "article" &&
                (roleArticles.find((a) => a.slug === view.slug)?.title ??
                  "Article")}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text-primary transition-colors"
            aria-label="Close help panel"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {view.type === "home" && (
            <HomeView
              articles={roleArticles}
              categories={categories}
              suggestedArticles={suggestedArticles}
              onSelectArticle={navigateToArticle}
              onSelectCategory={(slug) =>
                setView({ type: "category", slug })
              }
            />
          )}

          {view.type === "category" && (
            <CategoryView
              categorySlug={view.slug}
              articles={roleArticles}
              onSelectArticle={navigateToArticle}
            />
          )}

          {view.type === "article" && (
            <ArticleView
              slug={view.slug}
              articles={roleArticles}
              helpBasePath={helpBasePath}
              onSelectArticle={navigateToArticle}
            />
          )}
        </div>

        <div className="border-t border-border-default px-4 py-3">
          <Link
            href={helpBasePath}
            className="flex items-center gap-2 text-sm text-text-secondary transition-colors hover:text-text-primary"
            onClick={onClose}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open full help guide
          </Link>
        </div>
      </div>
    </>,
    document.body,
  );

  return portal;
}

function HomeView({
  articles,
  categories,
  suggestedArticles,
  onSelectArticle,
  onSelectCategory,
}: {
  articles: HelpArticle[];
  categories: { slug: string; label: string }[];
  suggestedArticles: HelpArticle[];
  onSelectArticle: (slug: string) => void;
  onSelectCategory: (slug: string) => void;
}) {
  return (
    <div className="space-y-6">
      <HelpSearch articles={articles} onSelectArticle={onSelectArticle} />

      {suggestedArticles.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Suggested for this page
          </h3>
          <div className="space-y-2">
            {suggestedArticles.slice(0, 3).map((article) => (
              <HelpArticleCard
                key={article.slug}
                article={article}
                onClick={() => onSelectArticle(article.slug)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
          Topics
        </h3>
        <div className="space-y-1">
          {categories.map((cat) => (
            <button
              key={`${cat.slug}`}
              type="button"
              onClick={() => onSelectCategory(cat.slug)}
              className="flex w-full items-center rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function CategoryView({
  categorySlug,
  articles,
  onSelectArticle,
}: {
  categorySlug: string;
  articles: HelpArticle[];
  onSelectArticle: (slug: string) => void;
}) {
  const categoryArticles = getArticlesByCategory(categorySlug, articles);

  return (
    <div className="space-y-2">
      {categoryArticles.length > 0 ? (
        categoryArticles.map((article) => (
          <HelpArticleCard
            key={article.slug}
            article={article}
            onClick={() => onSelectArticle(article.slug)}
          />
        ))
      ) : (
        <p className="py-8 text-center text-sm text-text-muted">
          No articles in this category yet.
        </p>
      )}
    </div>
  );
}

function ArticleView({
  slug,
  articles,
  helpBasePath,
  onSelectArticle,
}: {
  slug: string;
  articles: HelpArticle[];
  helpBasePath: string;
  onSelectArticle: (slug: string) => void;
}) {
  const article = articles.find((a) => a.slug === slug);

  if (!article) {
    return (
      <p className="py-8 text-center text-sm text-text-muted">
        Article not found.
      </p>
    );
  }

  const relatedArticles = article.relatedArticles
    .map((relSlug) => articles.find((a) => a.slug === relSlug))
    .filter((a): a is HelpArticle => a !== undefined);

  return (
    <HelpArticleRenderer
      article={article}
      relatedArticles={relatedArticles}
      helpBasePath={helpBasePath}
    />
  );
}

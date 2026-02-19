"use client";

import * as React from "react";
import Link from "next/link";
import { Info, AlertTriangle, ArrowRight } from "lucide-react";
import type { HelpArticle, HelpVisualKey } from "@/lib/help/types";
import { getVisualComponent } from "@/components/help/visuals";
import { HelpVisualWrapper } from "@/components/help/visuals/help-visual-wrapper";

function StepVisual({ visualKey }: { visualKey: HelpVisualKey }) {
  const entry = getVisualComponent(visualKey);
  if (!entry) return null;
  return (
    <HelpVisualWrapper
      Component={entry.component}
      componentProps={entry.props}
    />
  );
}

function renderContent(text: string) {
  // Simple markdown-lite: **bold** and `code`
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-text-primary">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-bg-elevated px-1.5 py-0.5 text-xs font-mono text-text-primary"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

export function HelpArticleRenderer({
  article,
  relatedArticles,
  helpBasePath,
}: {
  article: HelpArticle;
  relatedArticles?: HelpArticle[];
  helpBasePath: string;
}) {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-text-primary">{article.title}</h2>
        <p className="mt-1 text-sm text-text-secondary">{article.description}</p>
      </div>

      {/* Hero visual */}
      {article.heroVisual && <StepVisual visualKey={article.heroVisual} />}

      {/* Steps */}
      <ol className="space-y-4">
        {article.steps.map((step, i) => (
          <li key={i} className="relative pl-8">
            <span className="absolute left-0 top-0 flex h-6 w-6 items-center justify-center rounded-full bg-bg-elevated text-xs font-semibold text-text-primary">
              {i + 1}
            </span>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-text-primary">
                {step.title}
              </h3>
              <p className="text-sm leading-relaxed text-text-secondary">
                {renderContent(step.content)}
              </p>

              {step.tip && (
                <div className="flex gap-2 rounded-lg border border-[var(--status-info-text)]/20 bg-[var(--status-info-bg)] p-3">
                  <Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-info-text)]" />
                  <p className="text-xs leading-relaxed text-[var(--status-info-text)]">
                    {renderContent(step.tip)}
                  </p>
                </div>
              )}

              {step.warning && (
                <div className="flex gap-2 rounded-lg border border-[var(--status-warning-text)]/20 bg-[var(--status-warning-bg)] p-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--status-warning-text)]" />
                  <p className="text-xs leading-relaxed text-[var(--status-warning-text)]">
                    {renderContent(step.warning)}
                  </p>
                </div>
              )}

              {step.visual && <StepVisual visualKey={step.visual} />}
            </div>
          </li>
        ))}
      </ol>

      {/* Related articles */}
      {relatedArticles && relatedArticles.length > 0 && (
        <div className="border-t border-border-subtle pt-4">
          <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">
            Related Articles
          </h4>
          <div className="space-y-1">
            {relatedArticles.map((related) => (
              <Link
                key={related.slug}
                href={`${helpBasePath}/${related.slug}`}
                className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
              >
                <ArrowRight className="h-3 w-3 shrink-0" />
                {related.title}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

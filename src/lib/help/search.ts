import type { HelpArticle } from "./types";

export function searchArticles(
  query: string,
  articles: HelpArticle[],
): HelpArticle[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const tokens = trimmed.split(/\s+/).filter(Boolean);

  const scored = articles
    .map((article) => {
      let score = 0;
      const titleLower = article.title.toLowerCase();
      const descLower = article.description.toLowerCase();
      const keywordsLower = article.keywords.map((k) => k.toLowerCase());
      const stepTitles = article.steps.map((s) => s.title.toLowerCase());
      const stepContents = article.steps.map((s) => s.content.toLowerCase());

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 10;
        if (descLower.includes(token)) score += 5;
        if (keywordsLower.some((k) => k.includes(token))) score += 3;
        if (stepTitles.some((t) => t.includes(token))) score += 2;
        if (stepContents.some((c) => c.includes(token))) score += 1;
      }

      return { article, score };
    })
    .filter((item) => item.score > 0);

  scored.sort((a, b) => b.score - a.score);

  return scored.map((item) => item.article);
}

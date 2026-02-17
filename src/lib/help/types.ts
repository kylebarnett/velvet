export type HelpVisualKey =
  | "sidebar-navigate"
  | "csv-import"
  | "file-upload"
  | "form-fill"
  | "cursor-click"
  | "approval-flow"
  | "metric-submission"
  | "chart-build"
  | "table-populate"
  | "status-change"
  | "share-link"
  | "drag-drop";

export type HelpStep = {
  title: string;
  content: string;
  tip?: string;
  warning?: string;
  visual?: HelpVisualKey;
};

export type HelpArticle = {
  slug: string;
  title: string;
  description: string;
  role: "investor" | "founder" | "shared";
  category: string;
  icon: string;
  relatedPages: string[];
  relatedArticles: string[];
  keywords: string[];
  steps: HelpStep[];
  heroVisual?: HelpVisualKey;
};

export type HelpCategory = {
  slug: string;
  label: string;
  icon: string;
  role: "investor" | "founder" | "shared";
  order: number;
};

export function getArticlesByRole(
  role: "investor" | "founder",
  articles: HelpArticle[],
): HelpArticle[] {
  return articles.filter((a) => a.role === role || a.role === "shared");
}

export function getArticlesByCategory(
  category: string,
  articles: HelpArticle[],
): HelpArticle[] {
  return articles.filter((a) => a.category === category);
}

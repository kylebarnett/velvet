import { searchArticles } from "./search";
import type { HelpArticle } from "./types";

function makeArticle(overrides: Partial<HelpArticle> = {}): HelpArticle {
  return {
    slug: "test-article",
    title: "Default Title",
    description: "Default description",
    role: "investor",
    category: "getting-started",
    icon: "book",
    relatedPages: ["/dashboard"],
    relatedArticles: [],
    keywords: [],
    steps: [],
    ...overrides,
  };
}

describe("searchArticles", () => {
  it("returns empty array for empty query", () => {
    const articles = [makeArticle({ title: "Import Companies" })];
    expect(searchArticles("", articles)).toEqual([]);
  });

  it("returns empty array for whitespace-only query", () => {
    const articles = [makeArticle({ title: "Import Companies" })];
    expect(searchArticles("   ", articles)).toEqual([]);
  });

  it("returns empty array when no articles match", () => {
    const articles = [makeArticle({ title: "Import Companies" })];
    expect(searchArticles("zebra", articles)).toEqual([]);
  });

  it("matches against title", () => {
    const articles = [
      makeArticle({ slug: "a1", title: "Import Companies" }),
      makeArticle({ slug: "a2", title: "View Reports" }),
    ];
    const results = searchArticles("import", articles);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("a1");
  });

  it("matches against description", () => {
    const articles = [
      makeArticle({
        slug: "a1",
        title: "Getting Started",
        description: "Learn how to upload CSV files",
      }),
    ];
    const results = searchArticles("upload", articles);
    expect(results).toHaveLength(1);
    expect(results[0].slug).toBe("a1");
  });

  it("matches against keywords", () => {
    const articles = [
      makeArticle({
        slug: "a1",
        title: "Metrics Overview",
        keywords: ["dashboard", "kpi", "revenue"],
      }),
    ];
    const results = searchArticles("kpi", articles);
    expect(results).toHaveLength(1);
  });

  it("matches against step titles and content", () => {
    const articles = [
      makeArticle({
        slug: "a1",
        title: "Setup",
        steps: [
          {
            title: "Configure notifications",
            content: "Go to settings and enable email alerts",
          },
        ],
      }),
    ];
    // "notifications" is in step title
    expect(searchArticles("notifications", articles)).toHaveLength(1);
    // "alerts" is in step content
    expect(searchArticles("alerts", articles)).toHaveLength(1);
  });

  it("is case insensitive", () => {
    const articles = [makeArticle({ title: "Import Companies" })];
    expect(searchArticles("IMPORT", articles)).toHaveLength(1);
    expect(searchArticles("Import", articles)).toHaveLength(1);
    expect(searchArticles("import", articles)).toHaveLength(1);
  });

  it("ranks title matches higher than description matches", () => {
    const articles = [
      makeArticle({
        slug: "desc-match",
        title: "Getting Started",
        description: "Learn about metrics and reporting",
      }),
      makeArticle({
        slug: "title-match",
        title: "Metrics Overview",
        description: "A general overview of the platform",
      }),
    ];
    const results = searchArticles("metrics", articles);
    expect(results).toHaveLength(2);
    // Title match (10pts) should come before description match (5pts)
    expect(results[0].slug).toBe("title-match");
    expect(results[1].slug).toBe("desc-match");
  });

  it("accumulates score from multiple tokens", () => {
    const articles = [
      makeArticle({
        slug: "both-tokens",
        title: "Import Companies from CSV",
        description: "Upload your portfolio data",
      }),
      makeArticle({
        slug: "one-token",
        title: "Import Companies",
        description: "Add companies to your portfolio",
      }),
    ];
    // "import csv" — both have "import" in title (10pts each)
    // but only "both-tokens" has "csv" in title (extra 10pts)
    const results = searchArticles("import csv", articles);
    expect(results[0].slug).toBe("both-tokens");
  });
});

import type { HelpArticle } from "../types";

import { investorGettingStartedArticles } from "./investor-getting-started";
import { investorPortfolioArticles } from "./investor-portfolio";
import { investorMetricRequestsArticles } from "./investor-metric-requests";
import { investorReportsArticles } from "./investor-reports";
import { investorLpReportingArticles } from "./investor-lp-reporting";
import { investorDocumentsArticles } from "./investor-documents";
import { investorTearSheetsArticles } from "./investor-tear-sheets";
import { founderGettingStartedArticles } from "./founder-getting-started";
import { founderDashboardArticles } from "./founder-dashboard";
import { founderMetricsArticles } from "./founder-metrics";
import { founderDocumentsArticles } from "./founder-documents";
import { founderTearSheetsArticles } from "./founder-tear-sheets";
import { founderInvestorsArticles } from "./founder-investors";
import { sharedImportDataArticles } from "./shared-import-data";
import { sharedTeamArticles } from "./shared-team";
import { sharedAccountArticles } from "./shared-account";
import { sharedCommandPaletteArticles } from "./shared-command-palette";

export const ALL_ARTICLES: HelpArticle[] = [
  ...investorGettingStartedArticles,
  ...investorPortfolioArticles,
  ...investorMetricRequestsArticles,
  ...investorReportsArticles,
  ...investorLpReportingArticles,
  ...investorDocumentsArticles,
  ...investorTearSheetsArticles,
  ...founderGettingStartedArticles,
  ...founderDashboardArticles,
  ...founderMetricsArticles,
  ...founderDocumentsArticles,
  ...founderTearSheetsArticles,
  ...founderInvestorsArticles,
  ...sharedImportDataArticles,
  ...sharedTeamArticles,
  ...sharedAccountArticles,
  ...sharedCommandPaletteArticles,
];

/**
 * Returns articles relevant to a given route path and role.
 * Matches articles whose `relatedPages` include the current path
 * (using startsWith for prefix matching, e.g. "/companies/" matches "/companies/123").
 */
export function getArticlesForRoute(
  pathname: string,
  role: "investor" | "founder",
): HelpArticle[] {
  return ALL_ARTICLES.filter((article) => {
    if (article.role !== role && article.role !== "shared") return false;
    return article.relatedPages.some(
      (page) => pathname === page || pathname.startsWith(page),
    );
  });
}

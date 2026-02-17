import type { HelpArticle } from "../types";

export const sharedCommandPaletteArticles: HelpArticle[] = [
  {
    slug: "command-palette",
    title: "Command Palette",
    description:
      "Use the command palette to quickly search, navigate, and take actions from anywhere in the app.",
    role: "shared",
    category: "team",
    icon: "search",
    relatedPages: [
      "/companies",
      "/contacts",
      "/metric-requests",
      "/tear-sheets",
      "/reports",
      "/documents",
      "/funds",
      "/help",
      "/team",
      "/portal",
      "/portal/company",
      "/portal/requests",
      "/portal/documents",
      "/portal/tear-sheets",
      "/portal/investors",
      "/portal/activity",
      "/portal/help",
      "/portal/team",
    ],
    relatedArticles: [
      "welcome-investor",
      "welcome-founder",
      "account-settings",
    ],
    keywords: [
      "search",
      "command",
      "palette",
      "keyboard",
      "shortcut",
      "navigate",
      "find",
      "cmd",
      "ctrl",
      "quick",
    ],
    steps: [
      {
        title: "Open the command palette",
        content:
          "Press Cmd+K (Mac) or Ctrl+K (Windows/Linux) from any page. You can also click the \"Search...\" button in the sidebar. On mobile, tap the search icon in the top header bar.",
        tip: "The keyboard shortcut works from any page in the app -- you never need to navigate to a search page first.",
      },
      {
        title: "Search for anything",
        content:
          "Start typing to search across companies, contacts, documents, tear sheets, funds, and help articles. Results appear instantly as you type, grouped by category. Select a result to navigate directly to it.",
      },
      {
        title: "Navigate to any page",
        content:
          "Type the name of a page (e.g. \"Reports\", \"Documents\", \"Team\") to see matching navigation options. Press Enter to jump to that page instantly. This is the fastest way to move around the app.",
      },
      {
        title: "Execute quick actions",
        content:
          "The palette also shows available actions like \"Create Metric Request\", \"Import Companies\", \"Upload Document\", or \"Toggle Theme\". Select an action to execute it immediately without navigating through menus.",
      },
      {
        title: "Ask AI questions (investors)",
        content:
          "Investors can type natural language questions like \"show companies with ARR over 1M\" or \"compare revenue across portfolio\". Select the AI option at the bottom of the results to get an instant answer powered by your portfolio data.",
        tip: "AI queries work best with specific questions about your portfolio metrics, companies, or performance data.",
      },
      {
        title: "Recent items",
        content:
          "When you first open the palette, your recently accessed items appear at the top for quick access. This makes it easy to jump back to companies, pages, or actions you use frequently.",
      },
    ],
  },
];

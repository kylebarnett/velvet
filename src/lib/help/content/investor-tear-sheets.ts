import type { HelpArticle } from "../types";

export const investorTearSheetsArticles: HelpArticle[] = [
  {
    slug: "viewing-founder-tear-sheets",
    title: "Viewing Founder Tear Sheets",
    description:
      "Browse tear sheets published by your portfolio companies to get structured company summaries and highlights.",
    role: "investor",
    category: "tear-sheets",
    icon: "file-spreadsheet",
    relatedPages: ["/tear-sheets"],
    relatedArticles: [
      "creating-investor-tear-sheets",
      "viewing-company-detail",
      "browsing-documents-investor",
    ],
    keywords: [
      "tear sheet",
      "founder",
      "view",
      "company summary",
      "highlights",
      "published",
      "portfolio",
    ],
    steps: [
      {
        title: "Navigate to Tear Sheets",
        content:
          'Click "Tear Sheets" in the sidebar to view all available tear sheets. The page shows both tear sheets published by founders and any you have created yourself.',
      },
      {
        title: "Identify founder-published tear sheets",
        content:
          "Each tear sheet card shows the company name, the creator's name, and a publication date. Founder-published tear sheets are created by the founders themselves and reflect how they want to present their company. Look for the creator name to distinguish founder-authored sheets from your own.",
        tip: "Founder tear sheets are a great way to understand how the company positions itself. They often include key highlights, milestones, and forward-looking priorities that may not be captured in raw metric data.",
      },
      {
        title: "Open and read a tear sheet",
        content:
          "Click on any tear sheet card to open the full view. The tear sheet typically includes a company overview, key metrics, recent achievements, team highlights, and forward-looking goals structured in a clean, readable format.",
      },
      {
        title: "Compare across companies",
        content:
          "Use tear sheets alongside the Reports comparison view to get both qualitative (tear sheet narrative) and quantitative (metrics) perspectives on each company. This combination provides a more complete picture for investment decisions.",
      },
    ],
  },
  {
    slug: "creating-investor-tear-sheets",
    title: "Creating Investor Tear Sheets",
    description:
      "Create your own tear sheets and investment memos about portfolio companies for internal use and LP communication.",
    role: "investor",
    category: "tear-sheets",
    icon: "file-plus",
    relatedPages: ["/tear-sheets"],
    relatedArticles: [
      "viewing-founder-tear-sheets",
      "viewing-company-detail",
      "generating-lp-reports",
    ],
    keywords: [
      "create",
      "tear sheet",
      "memo",
      "write",
      "investor",
      "internal",
      "notes",
      "analysis",
    ],
    steps: [
      {
        title: "Start a new tear sheet",
        content:
          'On the Tear Sheets page, click the "New Tear Sheet" button. You will be taken to the tear sheet editor where you can build a structured company summary.',
      },
      {
        title: "Select the company",
        content:
          "Choose which portfolio company this tear sheet is about. Selecting a company links the tear sheet to their record and makes it easy to find later when viewing that company's detail page.",
      },
      {
        title: "Fill in the tear sheet sections",
        content:
          "The editor provides structured sections: Highlights, Key Metrics, Milestones, Challenges, Team Updates, Outlook, and Ask of Investors. Fill in each section with your analysis and notes.",
        tip: "Tear sheets you create are visible to other members of your organization but are not shared with the founder. Use them freely for internal analysis and documentation.",
        visual: "form-fill",
      },
      {
        title: "Add key metrics and highlights",
        content:
          "Include specific data points that support your analysis. Reference recent revenue figures, growth rates, or operational metrics. The tear sheet format is designed to give a quick snapshot, so keep data points focused on what matters most.",
      },
      {
        title: "Save and publish",
        content:
          "Click Save to store your tear sheet as a draft. When ready, publish it to make it available to your team. Published tear sheets appear in the Tear Sheets list alongside founder-published ones.",
        warning:
          "Published tear sheets are visible to all members of your organization. Review the content carefully before publishing, especially if the tear sheet contains sensitive investment considerations.",
      },
    ],
  },
];

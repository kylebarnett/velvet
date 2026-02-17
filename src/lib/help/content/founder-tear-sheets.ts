import type { HelpArticle } from "../types";

export const founderTearSheetsArticles: HelpArticle[] = [
  {
    slug: "creating-tear-sheets-founder",
    title: "Creating Tear Sheets",
    description:
      "How to create a quarterly tear sheet that showcases your company's performance.",
    role: "founder",
    category: "tear-sheets",
    icon: "file-spreadsheet",
    relatedPages: ["/portal/tear-sheets"],
    relatedArticles: [
      "publishing-tear-sheets",
      "responding-metric-requests",
      "uploading-documents",
    ],
    keywords: [
      "tear sheet",
      "create",
      "quarterly",
      "summary",
      "new",
      "quarter",
      "year",
    ],
    steps: [
      {
        title: "Navigate to Tear Sheets",
        content:
          "Click \"Tear Sheets\" in the sidebar. You will see a list of your existing tear sheets (if any) with their title, period, status, and last updated date. The page supports both grid and list view modes, and you can filter by quarter or year.",
      },
      {
        title: "Start a new tear sheet",
        content:
          "Click the \"New Tear Sheet\" button in the top-right corner. This takes you to a creation form where you configure the basics: quarter, year, and an optional title.",
      },
      {
        title: "Select the quarter and year",
        content:
          "Choose the quarter (Q1, Q2, Q3, or Q4) and the year for your tear sheet. The form defaults to the most recently completed quarter. For example, if it is currently February, it will default to Q4 of the previous year.",
        tip: "You can create tear sheets for any past quarter, not just the most recent one. This is useful for backfilling historical summaries.",
      },
      {
        title: "Set a title",
        content:
          "Optionally enter a custom title for the tear sheet. If you leave this blank, a default title is generated automatically (e.g. \"Q4 2025 Update\"). The title appears in the tear sheet list and when shared with investors.",
      },
      {
        title: "Create and edit",
        content:
          "Click \"Create Tear Sheet\" to create the tear sheet in draft status. You will be redirected to the tear sheet editor where you can add content sections, key metrics highlights, milestones, and narrative updates. Fill in as much detail as you want before publishing.",
        visual: "status-change",
      },
    ],
  },
  {
    slug: "publishing-tear-sheets",
    title: "Publishing & Sharing Tear Sheets",
    description:
      "How to publish a tear sheet and share it with investors via a link.",
    role: "founder",
    category: "tear-sheets",
    icon: "share-2",
    relatedPages: ["/portal/tear-sheets"],
    relatedArticles: [
      "creating-tear-sheets-founder",
      "managing-investor-access",
      "understanding-dashboard",
    ],
    keywords: [
      "publish",
      "share",
      "tear sheet",
      "link",
      "draft",
      "status",
      "investors",
      "share token",
    ],
    steps: [
      {
        title: "Open a tear sheet",
        content:
          "From the Tear Sheets list, click on the tear sheet you want to publish. This opens the tear sheet detail and editor page where you can review the content before publishing.",
      },
      {
        title: "Review your content",
        content:
          "Before publishing, review all sections of the tear sheet to make sure the information is accurate and complete. Check key metrics, milestones, and any narrative updates. Once published, approved investors will be able to see the tear sheet.",
        warning:
          "Published tear sheets are visible to all approved investors. Double-check that no confidential information is included that you do not want shared.",
      },
      {
        title: "Publish the tear sheet",
        content:
          "Click the \"Publish\" button on the tear sheet detail page to make it visible to approved investors. The status badge changes from yellow (Draft) to green (Published) to confirm the update.",
        visual: "status-change",
      },
      {
        title: "Share with a link",
        content:
          "To share the tear sheet outside of Velvet, enable sharing. This generates a unique share link that anyone with the link can use to view the tear sheet without logging in. Click \"Copy Link\" to copy the URL and send it via email or messaging.",
        tip: "The share link works for anyone, not just Velvet users. This is useful for sharing with LPs or advisors who do not have a Velvet account.",
        visual: "share-link",
      },
      {
        title: "Manage published tear sheets",
        content:
          "You can unpublish a tear sheet at any time by clicking the \"Unpublish\" button, which returns it to Draft status. Deleting a tear sheet permanently removes it, so use the delete action with caution -- a confirmation dialog will appear first.",
      },
    ],
  },
];

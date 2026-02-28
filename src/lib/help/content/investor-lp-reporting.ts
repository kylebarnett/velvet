import type { HelpArticle } from "../types";

export const investorLpReportingArticles: HelpArticle[] = [
  {
    slug: "creating-lp-funds",
    title: "Creating & Managing LP Funds",
    description:
      "Set up fund entities in PostSig, configure fund details, and manage the fund lifecycle from setup through close.",
    role: "investor",
    category: "lp-reporting",
    icon: "landmark",
    relatedPages: ["/funds"],
    relatedArticles: [
      "tracking-investments",
      "generating-lp-reports",
      "welcome-investor",
    ],
    keywords: [
      "fund",
      "create",
      "LP",
      "setup",
      "manage",
      "vehicle",
      "vintage",
      "AUM",
    ],
    steps: [
      {
        title: "Navigate to Funds",
        content:
          'Click "Funds" in the sidebar to expand it, then click "Overview". This is where you manage all your fund vehicles.',
      },
      {
        title: "Create a new fund",
        content:
          'Click "Create Fund" to open the fund creation modal. Enter the fund name (e.g., "Fund I"), vintage year, fund size, and currency (USD, EUR, or GBP). Click Create to save the fund.',
        visual: "form-fill-fund",
        tip: "Set the vintage year to the year the fund began making investments. This is used in IRR and other time-based calculations.",
      },
      {
        title: "Add investments to the fund",
        content:
          "Once the fund is created, click into it to view the fund detail page. From here you can start linking investments to it. Each investment maps to a portfolio company and tracks deployed capital and valuations. See the \"Tracking Investments in a Fund\" article for details.",
      },
      {
        title: "Manage fund lifecycle",
        content:
          "Funds can be edited or updated as they progress. Click on a fund card to view its details, investments, and performance metrics. You can create LP reports from a fund's detail page.",
      },
    ],
  },
  {
    slug: "tracking-investments",
    title: "Tracking Investments in a Fund",
    description:
      "Add individual investments to a fund, track deployed capital, record valuations, and monitor returns over time.",
    role: "investor",
    category: "lp-reporting",
    icon: "trending-up",
    relatedPages: ["/funds"],
    relatedArticles: [
      "creating-lp-funds",
      "generating-lp-reports",
      "viewing-company-detail",
    ],
    keywords: [
      "investment",
      "track",
      "capital",
      "deployed",
      "valuation",
      "returns",
      "ownership",
      "portfolio",
    ],
    steps: [
      {
        title: "Open a fund detail page",
        content:
          "From the Funds section under LP Reports, click on the fund you want to add investments to. The fund detail page shows an overview and a list of all investments in the fund.",
      },
      {
        title: "Add a new investment",
        content:
          'Click "Add Investment" to link a portfolio company to this fund. Select the company from your portfolio, enter the invested amount, current value, realized value, investment date, and optional notes.',
        tip: "If the company is already in your portfolio, selecting it will automatically link the investment to the company record, enabling metric data to flow into LP reports.",
        visual: "form-fill-investment",
      },
      {
        title: "Record follow-on investments",
        content:
          "If you make additional investments in the same company from the same fund, add each as a separate entry. PostSig will aggregate the total deployed capital accordingly.",
      },
      {
        title: "Update valuations",
        content:
          "Periodically update the current valuation for each investment. This is typically done quarterly based on the latest financing round, comparable valuations, or internal marks. Updated valuations feed directly into TVPI and MOIC calculations.",
        warning:
          "Valuation updates affect all LP reports that include this fund. Make sure valuations are reviewed and approved before updating, as the changes will be reflected immediately in calculated metrics.",
      },
      {
        title: "Record distributions and exits",
        content:
          "When a portfolio company distributes cash or is exited, record the distribution amount and date. This updates DPI (Distributions to Paid-In) and contributes to the fund's realized return metrics.",
      },
      {
        title: "Review investment summary",
        content:
          "The investment detail shows a complete history of all transactions: initial investment, follow-ons, valuation changes, and distributions. A summary card at the top shows current MOIC and unrealized vs. realized value for the individual investment.",
      },
    ],
  },
  {
    slug: "generating-lp-reports",
    title: "Generating LP Reports",
    description:
      "Create professional LP reports with calculated fund metrics including TVPI, DPI, IRR, and MOIC.",
    role: "investor",
    category: "lp-reporting",
    icon: "file-bar-chart",
    relatedPages: ["/funds/lp-reports"],
    relatedArticles: [
      "creating-lp-funds",
      "tracking-investments",
      "building-portfolio-report",
    ],
    keywords: [
      "LP report",
      "generate",
      "TVPI",
      "DPI",
      "IRR",
      "MOIC",
      "fund performance",
      "limited partner",
    ],
    steps: [
      {
        title: "Navigate to LP Reports",
        content:
          'Click "Funds" in the sidebar and then "LP Reports" to see all previously generated reports. You can also create new reports from a fund\'s detail page.',
      },
      {
        title: "Create a new LP report",
        content:
          'Click "New Report" and select the fund to report on. Choose the reporting period (typically quarterly, e.g., Q4 2025). The report builder will pull in all investment data for the selected fund as of that date.',
      },
      {
        title: "Review calculated metrics",
        content:
          "PostSig automatically calculates key fund metrics based on your investment data. TVPI (Total Value to Paid-In) shows total value relative to invested capital. DPI (Distributions to Paid-In) shows realized returns. IRR (Internal Rate of Return) measures annualized performance. MOIC (Multiple on Invested Capital) shows the overall multiple.",
        tip: "Make sure all investment valuations are up to date before generating the report. Stale valuations will produce inaccurate fund-level metrics.",
      },
      {
        title: "Customize the report layout",
        content:
          "The report editor lets you choose which sections to include: fund overview, performance summary, individual investment details, and portfolio company highlights. You can reorder sections and add commentary to provide context for the numbers.",
      },
      {
        title: "Preview and finalize",
        content:
          "Use the preview mode to see how the report will look before finalizing. Check that all numbers are correct, commentary is clear, and the layout is professional. Once satisfied, finalize the report to lock it for distribution.",
        warning:
          "Finalizing a report locks its data as of the report date. Subsequent changes to investment valuations will not retroactively update finalized reports. Generate a new report for the current period instead.",
      },
      {
        title: "Export or share the report",
        content:
          "Finalized reports can be exported as PDF for distribution to LPs. The exported document includes your fund branding, calculated metrics, charts, and any commentary you added. You can also share a link directly with LP contacts if they have PostSig accounts.",
        visual: "share-link",
      },
    ],
  },
];

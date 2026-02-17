import type { HelpArticle } from "../types";

export const founderDashboardArticles: HelpArticle[] = [
  {
    slug: "understanding-dashboard",
    title: "Understanding Your Dashboard",
    description:
      "What the founder dashboard shows and how to use it to stay on top of requests and activity.",
    role: "founder",
    category: "dashboard",
    icon: "layout-dashboard",
    relatedPages: ["/portal"],
    relatedArticles: [
      "dashboard-kpis-founder",
      "customizing-dashboard",
      "responding-metric-requests",
    ],
    keywords: [
      "dashboard",
      "overview",
      "KPI",
      "pending requests",
      "activity",
      "home",
    ],
    steps: [
      {
        title: "View your KPI cards",
        content:
          "At the top of the dashboard you will see three KPI cards: \"Linked Investors\" (how many investors are connected to your company), \"Pending Requests\" (metric requests awaiting your submission), and \"Submitted This Quarter\" (metrics you have already submitted for the current quarter). Each card is clickable and links to the relevant page.",
        visual: "chart-build",
      },
      {
        title: "Company header",
        content:
          "Below the page title, the company header displays your company name, logo, industry, stage, and website. This header gives you a quick at-a-glance view of how your company is represented to investors. To update your profile, navigate to the Company page in the sidebar.",
      },
      {
        title: "Review the data completeness section",
        content:
          "If you have pending metric requests, the dashboard shows a data completeness summary including: how many metrics you have submitted out of the total requested, any overdue requests, days until the next due date, and a list of missing metrics with links to submit them.",
        tip: "Keeping your data completeness at 100% ensures investors always have the latest numbers.",
      },
      {
        title: "Check the Getting Started checklist",
        content:
          "At the bottom of the dashboard, the Getting Started checklist tracks your onboarding progress. Steps include completing your profile, reviewing investors, submitting metrics, importing historical data, and uploading documents. Each item shows a green checkmark when complete. You can dismiss the checklist once you have finished all steps.",
      },
    ],
  },
  {
    slug: "customizing-dashboard",
    title: "Customizing Dashboard Views",
    description:
      "How to create custom dashboard views with metric charts and widgets.",
    role: "founder",
    category: "dashboard",
    icon: "sliders-horizontal",
    relatedPages: ["/portal"],
    relatedArticles: [
      "understanding-dashboard",
      "dashboard-kpis-founder",
      "responding-metric-requests",
    ],
    keywords: [
      "customize",
      "dashboard",
      "views",
      "widgets",
      "charts",
      "layout",
      "builder",
      "template",
    ],
    steps: [
      {
        title: "Enter the dashboard builder",
        content:
          "On your dashboard page, look for the \"Edit Dashboard\" or pencil icon button near the view selector. Clicking it navigates you to the dashboard builder where you can configure which metric charts and widgets are displayed.",
      },
      {
        title: "Choose a template or start from scratch",
        content:
          "The builder offers pre-built templates tailored to different industries (e.g. SaaS, Marketplace). Select a template to pre-populate your layout with common widgets, or start with a blank canvas and add widgets manually.",
        tip: "Templates are a great starting point. You can always customize them after applying.",
      },
      {
        title: "Add and arrange widgets",
        content:
          "Use the widget picker to add metric charts to your dashboard. Each widget can display a specific metric as a line chart, bar chart, or summary card. Drag widgets to rearrange them in the order you prefer.",
        visual: "drag-drop",
      },
      {
        title: "Create multiple views",
        content:
          "You can save multiple named views (e.g. \"Revenue Overview\", \"Growth Metrics\"). One view can be set as the default, which loads automatically when you open the dashboard. Switch between views using the view selector dropdown on the main dashboard page.",
      },
      {
        title: "Save and return",
        content:
          "Click \"Save\" to persist your changes. The builder warns you if you try to navigate away with unsaved changes. Once saved, click \"Back to Dashboard\" to see your customized view in action.",
        warning:
          "Unsaved changes will be lost if you navigate away without saving. A confirmation dialog will appear to prevent accidental data loss.",
      },
    ],
  },
  {
    slug: "dashboard-kpis-founder",
    title: "Dashboard KPIs Explained",
    description:
      "A detailed explanation of each KPI card on the founder dashboard.",
    role: "founder",
    category: "dashboard",
    icon: "bar-chart-3",
    relatedPages: ["/portal"],
    relatedArticles: [
      "understanding-dashboard",
      "responding-metric-requests",
      "managing-investor-access",
    ],
    keywords: [
      "KPI",
      "metrics",
      "linked investors",
      "pending requests",
      "submitted",
      "quarter",
    ],
    steps: [
      {
        title: "Linked Investors",
        content:
          "This card shows the total number of investors connected to your company, regardless of approval status. It includes approved, pending, and denied investors. Click the card to go to the Investors page where you can manage access. A higher number means more investors are tracking your company.",
      },
      {
        title: "Pending Requests",
        content:
          "This card displays the count of metric requests from investors that you have not yet fulfilled. These are requests with a \"pending\" status. Click the card to go to Metric Requests and start submitting. Keeping this number low shows investors that you are responsive.",
        tip: "If you see a high number of pending requests, use the batch submission form to submit multiple metrics at once for a given period.",
      },
      {
        title: "Submitted This Quarter",
        content:
          "This card shows how many distinct metrics you have submitted during the current calendar quarter. It counts unique metric names with values in the current quarter date range. A higher number indicates better data coverage for the period.",
      },
      {
        title: "How KPIs update",
        content:
          "KPI values refresh each time you load the dashboard. After submitting metrics or approving investors, return to the dashboard to see updated numbers. The cards also display a subtitle with additional context, such as the current quarter label for the submitted count.",
      },
    ],
  },
];

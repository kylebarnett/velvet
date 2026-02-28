import type { HelpArticle } from "../types";

export const investorGettingStartedArticles: HelpArticle[] = [
  {
    slug: "welcome-investor",
    title: "Welcome & First Steps",
    description:
      "An overview of the PostSig investor platform and how to get up and running quickly. Learn how to import companies, request metrics, and generate reports.",
    role: "investor",
    category: "getting-started",
    icon: "sparkles",
    relatedPages: ["/companies", "/"],
    relatedArticles: [
      "dashboard-overview-investor",
      "importing-companies-csv",
      "creating-metric-requests",
    ],
    keywords: [
      "welcome",
      "getting started",
      "first steps",
      "onboarding",
      "setup",
      "new account",
      "investor",
      "overview",
    ],
    heroVisual: "sidebar-navigate",
    steps: [
      {
        title: "Create your account",
        content:
          "Sign up at the PostSig login page using your email address. Choose \"Investor\" as your role during registration. You will receive a confirmation email to verify your account before you can log in.",
        tip: "Use your work email so founders recognize your organization when they receive invitations.",
      },
      {
        title: "Import your portfolio companies",
        content:
          'Head to the Contacts page from the sidebar and click "Import CSV". You can upload a CSV file with columns for Company Name, First Name, Last Name, and Email, or add contacts one at a time. PostSig will automatically deduplicate companies by founder email.',
        tip: "Download the CSV template first to ensure your data is formatted correctly. Column names are flexible (e.g. \"Company Name\", \"company_name\", or \"companyName\" all work).",
        visual: "csv-import",
      },
      {
        title: "Send your first metric request",
        content:
          'Navigate to Metric Requests in the sidebar. Click "New request" to create a one-time request. Select the companies and metrics you want, then send the request. Founders will receive an email notification. You can also create reusable templates on the separate Templates page.',
      },
      {
        title: "Explore reports and dashboards",
        content:
          "Once founders begin submitting metrics, your dashboard will populate with KPI cards showing portfolio companies, submissions awaiting response, and recent submissions. Visit the Reports section to build portfolio summary reports, compare companies side by side, and view benchmark percentiles.",
      },
    ],
  },
  {
    slug: "dashboard-overview-investor",
    title: "Dashboard Overview & KPIs",
    description:
      "Understand the investor dashboard layout, what each KPI card means, and how to use the activity feed to stay on top of your portfolio.",
    role: "investor",
    category: "getting-started",
    icon: "layout-dashboard",
    relatedPages: ["/companies"],
    relatedArticles: [
      "welcome-investor",
      "viewing-company-detail",
      "creating-metric-requests",
    ],
    keywords: [
      "dashboard",
      "KPI",
      "overview",
      "metrics",
      "activity",
      "summary",
      "cards",
      "home",
    ],
    heroVisual: "chart-build",
    steps: [
      {
        title: "Navigate to your dashboard",
        content:
          "Your dashboard is the landing page after login. You can always return to it by clicking the PostSig logo or the home icon in the sidebar. It provides a high-level snapshot of your entire portfolio.",
      },
      {
        title: "Understand the KPI cards",
        content:
          "The top row displays three summary cards: \"Portfolio companies\" shows how many companies are in your portfolio; \"Awaiting submission\" shows companies with pending metric requests; \"Submitted this week\" shows companies that sent data in the last 7 days. Each card includes a subtitle explaining what it tracks.",
        tip: "Click on any KPI card to jump directly to the relevant page for more detail.",
      },
      {
        title: "Review the Getting Started checklist",
        content:
          "If you are new to PostSig, a Getting Started checklist appears on your dashboard. It walks you through key setup steps: importing companies, connecting with a founder, sending your first request, and viewing reports. You can dismiss it once complete.",
      },
      {
        title: "Take action from the dashboard",
        content:
          "The dashboard surfaces actionable items at a glance. Click a KPI card to jump to the relevant page. Below the KPI cards you will see your portfolio company cards. If requests are overdue, follow up with founders. The dashboard is designed to be your daily starting point.",
        warning:
          "KPI numbers update when the page loads. If you have been on the page for a while, refresh to see the latest data.",
      },
    ],
  },
];

import type { HelpArticle } from "../types";

export const founderMetricsArticles: HelpArticle[] = [
  {
    slug: "responding-metric-requests",
    title: "Responding to Metric Requests",
    description:
      "How to view and respond to metric requests from investors using the batch submission form.",
    role: "founder",
    category: "metrics",
    icon: "send",
    relatedPages: ["/portal/requests"],
    relatedArticles: [
      "understanding-metric-data",
      "importing-data-excel",
      "dashboard-kpis-founder",
    ],
    keywords: [
      "metric requests",
      "submit",
      "batch submission",
      "pending",
      "completed",
      "respond",
      "fulfill",
    ],
    steps: [
      {
        title: "Open Metric Requests",
        content:
          "Click \"Metric Requests\" in the sidebar to open the requests page. You will see two tabs at the top: \"Pending\" and \"Completed\". The Pending tab shows metrics your investors have requested but you have not yet submitted. The Completed tab shows previously fulfilled requests.",
      },
      {
        title: "Review pending requests",
        content:
          "Pending requests are grouped by period (e.g. \"Q4 2025 Metrics\" or \"January 2025 Metrics\"). Each group shows the metric names requested and the due date if one was set. Overdue requests are highlighted so you can prioritize them.",
        tip: "The tab label shows a count of pending requests in parentheses, e.g. \"Pending (5)\", so you can see at a glance how many are outstanding.",
      },
      {
        title: "Submit metrics for a period",
        content:
          "Click the \"Submit\" button on a period group to open the batch submission form. This form lists every metric requested for that period with an input field for each value. Enter the numeric values (e.g. revenue, headcount, burn rate) and optionally add notes to provide context. Click \"Submit all\" to submit all values at once.",
        tip: "You do not need to fill in every field. Partially completing the form saves the values you did enter, and you can come back later to fill in the rest.",
        visual: "metric-submission",
      },
      {
        title: "Understand auto-fulfillment",
        content:
          "When you submit a metric value, Velvet automatically fulfills matching requests from all approved investors. You only need to submit each metric once per period -- the platform handles distributing the data to every investor who requested it.",
      },
      {
        title: "Review completed requests",
        content:
          "Switch to the \"Completed\" tab to see all previously submitted metrics. Each entry shows the metric name, the value you submitted, the period, and when it was submitted. Use this tab to verify past submissions or reference historical values.",
      },
    ],
  },
  {
    slug: "understanding-metric-data",
    title: "Understanding Metric Data & Periods",
    description:
      "How periods work, what metric values mean, and how they are formatted across the platform.",
    role: "founder",
    category: "metrics",
    icon: "calendar",
    relatedPages: ["/portal/requests"],
    relatedArticles: [
      "responding-metric-requests",
      "importing-data-excel",
      "dashboard-kpis-founder",
    ],
    keywords: [
      "periods",
      "monthly",
      "quarterly",
      "annual",
      "metric format",
      "currency",
      "percentage",
      "values",
    ],
    steps: [
      {
        title: "Period types",
        content:
          "Metrics can be requested on three different cadences: Monthly (one calendar month), Quarterly (three-month periods: Q1 Jan-Mar, Q2 Apr-Jun, Q3 Jul-Sep, Q4 Oct-Dec), and Annual (full calendar year). Each metric request specifies which period type the investor wants.",
      },
      {
        title: "Period start and end dates",
        content:
          "Every metric value is associated with a period start date and period end date. For monthly metrics, these span a single month. For quarterly metrics, they span three months. Ensure you are submitting data for the correct period by checking the period label shown in the submission form.",
        warning:
          "Submitting a value for the wrong period can cause confusion. Always double-check the period label before saving.",
      },
      {
        title: "Value formatting",
        content:
          "Velvet automatically formats metric values based on the metric name. Currency metrics (Revenue, MRR, ARR, Burn Rate, etc.) display with a dollar sign and commas. Percentage metrics (Churn Rate, Gross Margin, etc.) display with a percent symbol. Enter raw numbers without formatting -- the platform handles display formatting for you.",
        tip: "Enter values as plain numbers. For example, enter \"150000\" for $150,000 in revenue, or \"5.2\" for a 5.2% churn rate.",
      },
      {
        title: "How values are stored",
        content:
          "All metric values are stored centrally at the company level. When you submit a value, it is saved once and visible to all approved investors. This means you never need to submit the same metric twice for different investors -- one submission serves everyone.",
      },
      {
        title: "Overdue requests and due dates",
        content:
          "Investors can optionally set due dates on metric requests. If a due date passes without a submission, the request is marked as overdue. Overdue requests are highlighted on the Metric Requests page and counted in your dashboard KPIs. Submit overdue metrics as soon as possible to maintain a good reporting cadence.",
      },
    ],
  },
];

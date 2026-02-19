import type { HelpArticle } from "../types";

export const investorMetricRequestsArticles: HelpArticle[] = [
  {
    slug: "creating-metric-requests",
    title: "Creating Metric Requests",
    description:
      "Send a one-time metric request to one or more founders asking them to submit specific data points for a given period.",
    role: "investor",
    category: "metric-requests",
    icon: "send",
    relatedPages: ["/metric-requests"],
    relatedArticles: [
      "metric-request-templates",
      "recurring-schedules",
      "batch-submission-table",
    ],
    keywords: [
      "create",
      "request",
      "send",
      "metrics",
      "one-time",
      "ask",
      "founder",
      "data",
    ],
    steps: [
      {
        title: "Navigate to Metric Requests",
        content:
          'Click "Metric Requests" in the sidebar under Portfolio. This page shows your metric requests along with a collapsible Recurring Schedules section. A separate Templates page is accessible via the "Templates" button in the header.',
      },
      {
        title: 'Click "New request"',
        content:
          'Click the "New request" button in the top-right corner to open the request creation form. You will be guided through selecting companies, metrics, and the reporting period.',
      },
      {
        title: "Select target companies",
        content:
          "Choose one or more companies to send the request to. Only companies with approved access will be available. You can use the search field to quickly find specific companies.",
        tip: "You can select all companies at once by using the select-all checkbox, then deselect any you want to exclude.",
        visual: "cursor-click",
      },
      {
        title: "Choose the metrics to request",
        content:
          "Pick from the list of available metrics such as Revenue, MRR, Burn Rate, Headcount, or any custom metrics you have defined. You can select multiple metrics in a single request.",
      },
      {
        title: "Set the reporting period",
        content:
          "Specify the period you are requesting data for (e.g., January 2026 for monthly, or Q4 2025 for quarterly). The founder will see this period clearly when they receive the request.",
      },
      {
        title: "Review and send",
        content:
          "Review the summary showing which companies will receive the request and which metrics are included. Click the create button to dispatch the request. Each founder will receive an email notification with a direct link to submit their data.",
        warning:
          "Once sent, a request cannot be unsent. Double-check the company list and metrics before confirming.",
      },
    ],
  },
  {
    slug: "metric-request-templates",
    title: "Using Metric Request Templates",
    description:
      "Save commonly requested metric sets as reusable templates to speed up future requests.",
    role: "investor",
    category: "metric-requests",
    icon: "copy",
    relatedPages: ["/metric-requests"],
    relatedArticles: [
      "creating-metric-requests",
      "recurring-schedules",
      "batch-submission-table",
    ],
    keywords: [
      "template",
      "reuse",
      "save",
      "preset",
      "standard",
      "metrics",
      "quick",
    ],
    steps: [
      {
        title: "Go to the Templates page",
        content:
          'On the Metric Requests page, click the "Templates" button in the header to navigate to the Templates page. This section shows all your saved templates and lets you create new ones.',
      },
      {
        title: "Create a new template",
        content:
          'Click "New Template" and give it a descriptive name (e.g., "Monthly Core Metrics" or "Quarterly Financial Review"). Select the metrics you want to include in this template.',
        tip: "Create separate templates for different reporting frequencies. For example, a monthly template with MRR, Burn Rate, and Headcount, and a quarterly template with Revenue, EBITDA, and Customer Count.",
        visual: "form-fill-template",
      },
      {
        title: "Save the template",
        content:
          "Click Save to store the template. It will appear in your Templates list and can be used whenever you create a new request.",
      },
      {
        title: "Use a template when creating requests",
        content:
          "When creating a new metric request, you will see an option to start from a template. Select a template and the metric fields will be pre-populated. You can still add or remove individual metrics before sending.",
      },
      {
        title: "Edit or delete templates",
        content:
          "From the Templates tab, click on any template to edit its name or metrics. You can also delete templates you no longer need. Deleting a template does not affect requests that were already sent using it.",
      },
    ],
  },
  {
    slug: "recurring-schedules",
    title: "Setting Up Recurring Schedules",
    description:
      "Automate metric requests on a quarterly or annual basis so founders receive regular reminders without manual effort.",
    role: "investor",
    category: "metric-requests",
    icon: "calendar-clock",
    relatedPages: ["/metric-requests"],
    relatedArticles: [
      "creating-metric-requests",
      "metric-request-templates",
      "batch-submission-table",
    ],
    keywords: [
      "recurring",
      "schedule",
      "automatic",
      "quarterly",
      "annual",
      "cadence",
      "reminder",
      "cron",
    ],
    steps: [
      {
        title: "Find the Recurring Schedules section",
        content:
          'On the Metric Requests page, look for the collapsible "Recurring Schedules" section. Click to expand it and view or manage your recurring request schedules.',
      },
      {
        title: "Create a new schedule",
        content:
          'Click "New Schedule" to set up an automated recurring request. Give the schedule a name that describes its purpose (e.g., "Monthly SaaS Metrics").',
      },
      {
        title: "Configure the cadence",
        content:
          "Choose the frequency: quarterly or annual. Configure the schedule details such as when requests should be sent within each period.",
        tip: "Sending requests a few days after period-end gives founders time to close their books before the request arrives.",
      },
      {
        title: "Select companies and metrics",
        content:
          "Choose which companies should receive the recurring request and which metrics to include. You can start from a saved template to pre-fill the metric selection.",
      },
      {
        title: "Create the schedule",
        content:
          "Review the schedule summary and click \"Create Schedule\" to activate it. Velvet will automatically send metric requests to the selected companies on the configured dates. You will see each generated request appear on the Metric Requests page when it is sent.",
        warning:
          "Schedules only send to companies where you have approved access. If a founder denies access after the schedule is created, they will be automatically skipped.",
      },
      {
        title: "Manage active schedules",
        content:
          "In the Recurring Schedules section, you can view, edit, or delete any schedule. Click into a schedule to see its details and manage it. You can also create new schedules from within this section.",
      },
    ],
  },
  {
    slug: "batch-submission-table",
    title: "Understanding the Batch Submission Table",
    description:
      "Learn how to read the metric submission table, understand value formatting, and interpret the data founders have submitted.",
    role: "investor",
    category: "metric-requests",
    icon: "table",
    relatedPages: ["/metric-requests"],
    relatedArticles: [
      "creating-metric-requests",
      "viewing-company-detail",
      "building-portfolio-report",
    ],
    keywords: [
      "table",
      "submission",
      "batch",
      "values",
      "format",
      "currency",
      "percentage",
      "data",
    ],
    heroVisual: "metric-submission",
    steps: [
      {
        title: "Find the submission table",
        content:
          "When viewing a specific metric request, you will see a table showing all companies and their submission statuses. Each row represents a company, and each column represents a requested metric.",
      },
      {
        title: "Understand status indicators",
        content:
          'Each cell in the table shows the submission status. A filled value means the founder has submitted data. "Pending" means the founder has not yet responded. "Overdue" appears when the submission deadline has passed without a response.',
      },
      {
        title: "Read value formatting",
        content:
          "Velvet automatically formats metric values based on the metric type. Revenue, MRR, and Burn Rate display as currency (e.g., $1,250,000). Churn Rate and margins display as percentages (e.g., 5.2%). Headcount and other count metrics display as plain numbers.",
        tip: "Burn Rate is always displayed as currency, never as a percentage, even though it contains the word \"rate.\" This is by design.",
      },
      {
        title: "Sort and filter the table",
        content:
          "Click on column headers to sort the table by that metric. You can also filter by submission status to focus on companies that have not yet responded, making follow-ups more efficient.",
      },
      {
        title: "Follow up on pending submissions",
        content:
          "Use the status indicators to identify companies that have not yet submitted. Focus on overdue submissions first, then pending ones. Following up promptly helps maintain a regular reporting cadence across your portfolio.",
      },
    ],
  },
];

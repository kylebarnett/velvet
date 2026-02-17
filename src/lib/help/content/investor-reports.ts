import type { HelpArticle } from "../types";

export const investorReportsArticles: HelpArticle[] = [
  {
    slug: "building-portfolio-report",
    title: "Building a Portfolio Summary Report",
    description:
      "Create and customize portfolio-level summary reports that aggregate metrics across all your companies.",
    role: "investor",
    category: "reports",
    icon: "bar-chart-3",
    relatedPages: ["/reports"],
    relatedArticles: [
      "comparing-companies",
      "benchmark-percentiles",
      "creating-metric-requests",
    ],
    keywords: [
      "report",
      "portfolio",
      "summary",
      "build",
      "customize",
      "aggregate",
      "dashboard",
      "analytics",
    ],
    steps: [
      {
        title: "Navigate to Reports",
        content:
          'Click "Reports" in the sidebar to open the reports section. The main Reports page provides links to the Summary view, Compare view, and Benchmarks view.',
      },
      {
        title: "Open the Summary report builder",
        content:
          "Click into the Summary section. Here you can configure which metrics and companies to include in your portfolio-level report. The builder gives you a real-time preview as you make changes.",
      },
      {
        title: "Select metrics to display",
        content:
          "Choose which metrics to include in the report. Common choices include Revenue, MRR, Burn Rate, and Headcount. The report will aggregate these across all selected companies and show trends over time.",
        tip: "Start with 3-5 key metrics for a focused report. You can always create additional reports for deeper analysis.",
      },
      {
        title: "Choose the time range",
        content:
          "Set the date range for the report. You can view monthly or quarterly data depending on how your founders submit metrics. The report will show data points for each period within your selected range.",
      },
      {
        title: "Customize chart types and layout",
        content:
          "Each metric can be displayed as a line chart, bar chart, or table. Adjust the layout to highlight the metrics that matter most. Charts automatically use theme-appropriate colors for both light and dark mode.",
        visual: "chart-build",
      },
      {
        title: "Save or export the report",
        content:
          "Once you are satisfied with the report, you can save the configuration for quick access later. Reports can also be exported for sharing with your team or LPs.",
      },
    ],
  },
  {
    slug: "comparing-companies",
    title: "Comparing Companies Side-by-Side",
    description:
      "Use the comparison view to evaluate two or more portfolio companies against each other on key metrics.",
    role: "investor",
    category: "reports",
    icon: "columns",
    relatedPages: ["/reports"],
    relatedArticles: [
      "building-portfolio-report",
      "benchmark-percentiles",
      "viewing-company-detail",
    ],
    keywords: [
      "compare",
      "side-by-side",
      "companies",
      "benchmark",
      "versus",
      "analysis",
      "performance",
    ],
    steps: [
      {
        title: "Open the Compare view",
        content:
          'From the Reports page, click on the "Compare" section. This view is designed for head-to-head comparison of companies on the same metrics.',
      },
      {
        title: "Select companies to compare",
        content:
          "Use the company selector to pick two or more companies you want to compare. Companies must have approved access and submitted metrics to be available for comparison.",
        tip: "For the clearest comparisons, choose companies at similar stages or in the same industry so the metrics are more directly comparable.",
      },
      {
        title: "Choose comparison metrics",
        content:
          "Select which metrics to include in the comparison. Each metric will be shown in its own chart or table row with values for each selected company displayed side by side.",
      },
      {
        title: "Analyze the comparison",
        content:
          "The comparison view shows each metric with values from all selected companies on the same chart. This makes it easy to spot which companies are outperforming on specific metrics. Trend lines show how performance has changed over time.",
        visual: "chart-build",
      },
      {
        title: "Adjust the time period",
        content:
          "Use the period selector to focus on a specific time range. You can compare current-period snapshots or look at trends across multiple months or quarters to understand growth trajectories.",
      },
    ],
  },
  {
    slug: "benchmark-percentiles",
    title: "Understanding Benchmark Percentiles",
    description:
      "Learn how Velvet calculates percentile rankings and what they mean for evaluating company performance within your portfolio.",
    role: "investor",
    category: "reports",
    icon: "award",
    relatedPages: ["/reports"],
    relatedArticles: [
      "comparing-companies",
      "building-portfolio-report",
      "viewing-company-detail",
    ],
    keywords: [
      "benchmark",
      "percentile",
      "ranking",
      "top",
      "quartile",
      "performance",
      "median",
      "distribution",
    ],
    steps: [
      {
        title: "Navigate to Benchmarks",
        content:
          'From the Reports page, click on the "Benchmarks" section. This view shows percentile rankings for your portfolio companies across key metrics.',
      },
      {
        title: "Understand percentile calculations",
        content:
          "Percentiles rank each company relative to others in your portfolio for a given metric. A company at the 90th percentile is performing better than 90% of the other companies on that metric. The 50th percentile represents the median.",
        tip: "Percentiles are calculated within your own portfolio, not against external datasets. The more companies with data for a metric, the more meaningful the percentiles become.",
      },
      {
        title: "Read the benchmark display",
        content:
          "Each metric shows a distribution chart with company positions marked along the range. Badges indicate quartile placement: top 25% (strong performance), 25-50% (above median), 50-75% (below median), and bottom 25% (needs attention). Colors shift from green to amber to red accordingly.",
      },
      {
        title: "Filter by stage or industry",
        content:
          "For more meaningful benchmarks, filter companies by stage (Seed, Series A, Series B, etc.) or industry. Comparing a Series A startup against a Series C company on revenue may not be fair, so filtering creates apples-to-apples comparisons.",
      },
      {
        title: "Use benchmarks for portfolio decisions",
        content:
          "Benchmarks help you identify outliers in both directions. Companies consistently in the top quartile may be good candidates for follow-on investment. Companies in the bottom quartile may need more support or attention. Combine benchmark data with qualitative judgment for the best outcomes.",
        warning:
          "Percentile rankings require at least a few companies with data for the same metric and period to be statistically meaningful. With very small portfolios, treat percentiles as rough indicators rather than precise rankings.",
      },
    ],
  },
];

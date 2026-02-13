export type ReportType = "summary" | "comparison" | "benchmarks" | "deep_dive";

export type ReportSection = {
  id: string;
  label: string;
  description: string;
  defaultVisible: boolean;
  exportable: boolean;
};

export type ReportTemplate = {
  type: ReportType;
  label: string;
  description: string;
  icon: string;
  color: string;
  sections: ReportSection[];
};

export const REPORT_TEMPLATES: Record<ReportType, ReportTemplate> = {
  summary: {
    type: "summary",
    label: "Portfolio Summary",
    description:
      "High-level KPIs, portfolio distribution, top performers, and trend analysis across your portfolio.",
    icon: "bar-chart-3",
    color: "blue",
    sections: [
      {
        id: "kpis",
        label: "Key Metrics",
        description: "Aggregate KPIs across your portfolio companies",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "time_series",
        label: "Portfolio Trend",
        description: "Time series chart of a selected metric over recent quarters",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "distribution",
        label: "Portfolio Distribution",
        description: "Industry and stage breakdown pie charts",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "top_performers",
        label: "Top Performers",
        description: "Companies ranked by revenue growth",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "data_freshness",
        label: "Data Freshness",
        description: "How recent your company data submissions are",
        defaultVisible: true,
        exportable: false,
      },
    ],
  },
  comparison: {
    type: "comparison",
    label: "Company Comparison",
    description:
      "Side-by-side metric comparison across selected companies with normalization options.",
    icon: "git-compare-arrows",
    color: "emerald",
    sections: [
      {
        id: "comparison_charts",
        label: "Comparison Charts",
        description: "Line charts comparing companies on selected metrics",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "comparison_table",
        label: "Data Tables",
        description: "Tabular view of raw metric values",
        defaultVisible: true,
        exportable: true,
      },
    ],
  },
  benchmarks: {
    type: "benchmarks",
    label: "Metric Benchmarks",
    description:
      "See how your portfolio companies rank against industry benchmarks with percentile bands.",
    icon: "trophy",
    color: "violet",
    sections: [
      {
        id: "benchmark_chart",
        label: "Benchmark Chart",
        description: "Bar chart with percentile reference lines",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "benchmark_portfolio",
        label: "Portfolio Distribution",
        description: "How your portfolio is distributed across percentile bands",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "benchmark_table",
        label: "Rankings Table",
        description: "Detailed company rankings with percentile scores",
        defaultVisible: true,
        exportable: true,
      },
    ],
  },
  deep_dive: {
    type: "deep_dive",
    label: "Company Deep Dive",
    description:
      "In-depth analysis of a single company: metrics overview, trends, and benchmark position.",
    icon: "search",
    color: "amber",
    sections: [
      {
        id: "company_overview",
        label: "Company Overview",
        description: "Company info, industry, stage, and last submission date",
        defaultVisible: true,
        exportable: false,
      },
      {
        id: "company_kpis",
        label: "Key Metrics",
        description: "Grid of latest metric values",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "company_trends",
        label: "Metric Trends",
        description: "Area charts showing each metric over time",
        defaultVisible: true,
        exportable: true,
      },
      {
        id: "company_benchmarks",
        label: "Benchmark Position",
        description: "How this company ranks against portfolio benchmarks",
        defaultVisible: true,
        exportable: true,
      },
    ],
  },
};

export const REPORT_TYPE_LABELS: Record<ReportType, string> = {
  summary: "Portfolio Summary",
  comparison: "Company Comparison",
  benchmarks: "Metric Benchmarks",
  deep_dive: "Company Deep Dive",
};

export const REPORT_TYPE_COLORS: Record<ReportType, string> = {
  summary: "blue",
  comparison: "emerald",
  benchmarks: "violet",
  deep_dive: "amber",
};

export function getDefaultSections(type: ReportType): string[] {
  return REPORT_TEMPLATES[type].sections
    .filter((s) => s.defaultVisible)
    .map((s) => s.id);
}

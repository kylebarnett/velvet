import type { HelpArticle } from "../types";

export const sharedImportDataArticles: HelpArticle[] = [
  {
    slug: "importing-data-excel",
    title: "Importing Data from Excel/CSV",
    description:
      "A full walkthrough of the historical data import wizard: upload a file, map companies, review extracted values, and approve them.",
    role: "shared",
    category: "data-import",
    icon: "upload",
    relatedPages: ["/historical-upload", "/portal/historical-upload"],
    relatedArticles: [
      "responding-metric-requests",
      "understanding-metric-data",
      "welcome-founder",
    ],
    keywords: [
      "import",
      "upload",
      "Excel",
      "CSV",
      "historical",
      "bulk",
      "spreadsheet",
      "data",
      "wizard",
      "XLSX",
    ],
    heroVisual: "file-upload",
    steps: [
      {
        title: "Navigate to Import Data",
        content:
          "Click the settings gear icon in the sidebar footer and then click \"Import Data\" from the settings panel. This opens the Import Historical Metrics page, which includes the upload wizard and a history of past uploads.",
      },
      {
        title: "Upload your file",
        content:
          "In the first step of the wizard, drag and drop or click to select an Excel (.xlsx, .xls) or CSV file from your computer. The platform uses AI to analyze the spreadsheet structure and automatically extract metric names, values, periods, and company names from the data.",
        tip: "For best results, use a clean spreadsheet where metric names are in row or column headers and periods are clearly labeled (e.g. \"Q1 2025\", \"Jan 2025\", \"2024\").",
        visual: "csv-import",
      },
      {
        title: "Map companies (investors only)",
        content:
          "If you are an investor, the second step asks you to map company names found in the spreadsheet to companies in your portfolio. The system attempts to auto-match names, but you may need to manually match some entries using the dropdown selectors. Founders skip this step since uploads are automatically linked to their own company.",
        tip: "If a company in your spreadsheet is not yet in your portfolio, you will need to add it first and then re-upload.",
      },
      {
        title: "Review extracted values",
        content:
          "The review step shows all metric values extracted from your file in a table. Each row displays the metric name, period, value, and an AI confidence score. Review the values for accuracy. You can approve individual values, reject incorrect ones, or edit values before approving.",
        warning:
          "AI extraction is not perfect. Always review extracted values carefully, especially for unusual spreadsheet formats or merged cells.",
      },
      {
        title: "Approve or reject values",
        content:
          "For each extracted value, click \"Approve\" to import it or \"Reject\" to skip it. You can also use the bulk action buttons to approve or reject all values at once. Approved values are saved to the platform and become visible in metrics views. For founders, approved values are shared with all approved investors. For investors, approved values are stored privately.",
      },
      {
        title: "View upload history",
        content:
          "Below the wizard, the Upload History section shows all your past imports with their status, file name, number of values extracted, and how many were approved or rejected. Click on a past upload to review its details or see which values were imported.",
      },
    ],
  },
];

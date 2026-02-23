import type { HelpCategory } from "./types";

export const HELP_CATEGORIES: HelpCategory[] = [
  // Investor categories
  {
    slug: "getting-started",
    label: "Getting Started",
    icon: "sparkles",
    role: "investor",
    order: 0,
  },
  {
    slug: "portfolio",
    label: "Portfolio Management",
    icon: "briefcase",
    role: "investor",
    order: 1,
  },
  {
    slug: "metric-requests",
    label: "Metric Requests",
    icon: "send",
    role: "investor",
    order: 2,
  },
  {
    slug: "reports",
    label: "Reports & Analytics",
    icon: "bar-chart-3",
    role: "investor",
    order: 3,
  },
  {
    slug: "lp-reporting",
    label: "LP Reporting",
    icon: "landmark",
    role: "investor",
    order: 4,
  },
  {
    slug: "documents",
    label: "Documents",
    icon: "file-text",
    role: "investor",
    order: 5,
  },
  {
    slug: "tear-sheets",
    label: "Tear Sheets",
    icon: "file-spreadsheet",
    role: "investor",
    order: 6,
  },

  // Founder categories
  {
    slug: "getting-started",
    label: "Getting Started",
    icon: "sparkles",
    role: "founder",
    order: 0,
  },
  {
    slug: "dashboard",
    label: "Dashboard",
    icon: "layout-dashboard",
    role: "founder",
    order: 1,
  },
  {
    slug: "metrics",
    label: "Metric Submissions",
    icon: "trending-up",
    role: "founder",
    order: 2,
  },
  {
    slug: "documents",
    label: "Documents",
    icon: "file-text",
    role: "founder",
    order: 3,
  },
  {
    slug: "tear-sheets",
    label: "Tear Sheets",
    icon: "file-spreadsheet",
    role: "founder",
    order: 4,
  },
  {
    slug: "investor-access",
    label: "Investor Access",
    icon: "shield",
    role: "founder",
    order: 5,
  },

  // Shared categories
  {
    slug: "communication",
    label: "Communication",
    icon: "message-square",
    role: "shared",
    order: 89,
  },
  {
    slug: "data-import",
    label: "Data Import",
    icon: "upload",
    role: "shared",
    order: 90,
  },
  {
    slug: "team",
    label: "Team & Settings",
    icon: "users",
    role: "shared",
    order: 91,
  },
];

export function getCategoriesForRole(
  role: "investor" | "founder",
): HelpCategory[] {
  return HELP_CATEGORIES.filter((c) => c.role === role || c.role === "shared").sort(
    (a, b) => a.order - b.order,
  );
}

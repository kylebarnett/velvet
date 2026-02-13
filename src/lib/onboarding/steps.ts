export type OnboardingStep = {
  id: string;
  page: string;
  target: string;
  title: string;
  message: string;
  action?: "click" | "navigate";
  navigateTo?: string;
};

export const INVESTOR_STEPS: OnboardingStep[] = [
  // Portfolio
  {
    id: "portfolio-welcome",
    page: "/portfolio",
    target: '[data-onboarding="portfolio-title"]',
    title: "Welcome to Your Portfolio",
    message:
      "This is where you manage all your portfolio companies and founder contacts.",
  },
  {
    id: "import-csv",
    page: "/portfolio",
    target: '[data-onboarding="import-csv"]',
    title: "Import Companies",
    message:
      "Bulk import companies from a CSV file with founder contact information.",
    action: "click",
  },
  {
    id: "add-contact",
    page: "/portfolio",
    target: '[data-onboarding="add-contact"]',
    title: "Add a Contact",
    message: "Or add founders one at a time with their email and company details.",
    action: "click",
  },
  // Dashboard
  {
    id: "dashboard-intro",
    page: "/dashboard",
    target: '[data-onboarding="dashboard-title"]',
    title: "Company Dashboard",
    message:
      "View metric snapshots, KPIs, and portfolio completion at a glance.",
  },
  {
    id: "company-card",
    page: "/dashboard",
    target: '[data-onboarding="company-card"]',
    title: "Company Overview",
    message:
      "Each card shows key metrics and growth trends. Click to see the full dashboard.",
  },
  // Requests
  {
    id: "requests-intro",
    page: "/metric-requests",
    target: '[data-onboarding="requests-title"]',
    title: "Campaigns",
    message:
      "Create and track metric collection campaigns across your portfolio.",
  },
  {
    id: "create-request",
    page: "/metric-requests",
    target: '[data-onboarding="new-request"]',
    title: "Send a Request",
    message:
      "Click here to create a metric request. Choose from templates or define custom metrics.",
    action: "click",
  },
  {
    id: "templates-tab",
    page: "/metric-requests",
    target: '[data-onboarding="templates-tab"]',
    title: "Metric Templates",
    message:
      "Save reusable metric sets and assign them to multiple companies at once.",
  },
  {
    id: "schedules-tab",
    page: "/metric-requests",
    target: '[data-onboarding="schedules-tab"]',
    title: "Automated Schedules",
    message:
      "Set up recurring requests that go out automatically on a monthly, quarterly, or annual cadence.",
  },
  // Reports
  {
    id: "reports-intro",
    page: "/reports",
    target: '[data-onboarding="reports-title"]',
    title: "Portfolio Reports",
    message:
      "Create and manage reports from templates — portfolio summaries, company comparisons, benchmarks, and deep dives.",
  },
  // Funds
  {
    id: "funds-intro",
    page: "/funds",
    target: '[data-onboarding="funds-title"]',
    title: "LP Fund Reporting",
    message:
      "Manage funds, track investments, calculate TVPI/DPI/IRR, and generate LP reports.",
  },
  // Team
  {
    id: "team-intro",
    page: "/team",
    target: '[data-onboarding="team-title"]',
    title: "Team Management",
    message:
      "Invite team members to collaborate on your portfolio. Assign admin, member, or viewer roles.",
  },
];

export const FOUNDER_STEPS: OnboardingStep[] = [
  // Portal
  {
    id: "founder-welcome",
    page: "/portal",
    target: '[data-onboarding="founder-welcome"]',
    title: "Welcome to Your Portal",
    message:
      "This is your company dashboard where you manage metrics, documents, and investor relationships.",
  },
  {
    id: "company-profile",
    page: "/portal",
    target: '[data-onboarding="company-profile"]',
    title: "Company Profile",
    message:
      "Update your company details — industry, stage, and website — to help investors understand your business.",
  },
  {
    id: "metrics-tab",
    page: "/portal",
    target: '[data-onboarding="metrics-tab"]',
    title: "Submit Metrics",
    message:
      "Submit your key performance metrics here. All approved investors will see the same data.",
  },
  {
    id: "documents-tab",
    page: "/portal",
    target: '[data-onboarding="documents-tab"]',
    title: "Upload Documents",
    message:
      "Upload financial statements, board decks, or investor updates for your investors to review.",
  },
  {
    id: "tear-sheets-tab",
    page: "/portal",
    target: '[data-onboarding="tear-sheets-tab"]',
    title: "Tear Sheets",
    message:
      "Create quarterly tear sheets to share highlights, milestones, and key metrics with investors.",
  },
  // Investors
  {
    id: "investors-page",
    page: "/portal/investors",
    target: '[data-onboarding="investors-title"]',
    title: "Manage Investors",
    message:
      "Approve or deny investor access to your metrics. You control who sees your data.",
  },
  // Requests
  {
    id: "requests-page",
    page: "/portal/requests",
    target: '[data-onboarding="requests-title"]',
    title: "View Requests",
    message:
      "See pending metric requests from your investors and submit responses in bulk.",
  },
  // Team
  {
    id: "team-page",
    page: "/portal/team",
    target: '[data-onboarding="team-title"]',
    title: "Team Management",
    message:
      "Invite team members to help manage your company data and metric submissions.",
  },
];

/** Backward-compatible alias. */
export const ONBOARDING_STEPS = INVESTOR_STEPS;

export type UserRole = "investor" | "founder";

export function getStepsForRole(role: UserRole): OnboardingStep[] {
  return role === "founder" ? FOUNDER_STEPS : INVESTOR_STEPS;
}

export function getTotalStepsForRole(role: UserRole): number {
  return getStepsForRole(role).length;
}

export const TOTAL_STEPS = INVESTOR_STEPS.length;

export function getStepById(id: string): OnboardingStep | undefined {
  return INVESTOR_STEPS.find((step) => step.id === id);
}

export function getStepIndex(id: string): number {
  return INVESTOR_STEPS.findIndex((step) => step.id === id);
}

export function getStepByIndex(index: number): OnboardingStep | undefined {
  return INVESTOR_STEPS[index];
}

export function getStepsForPage(page: string): OnboardingStep[] {
  return INVESTOR_STEPS.filter((step) => step.page === page);
}

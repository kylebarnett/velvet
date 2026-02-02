export type OnboardingStep = {
  id: string;
  page: string;
  target: string;
  title: string;
  message: string;
  action?: "click" | "navigate";
  navigateTo?: string;
};

export const ONBOARDING_STEPS: OnboardingStep[] = [
  // Page 1: Portfolio
  {
    id: "portfolio-welcome",
    page: "/portfolio",
    target: '[data-onboarding="portfolio-title"]',
    title: "Welcome to Velvet!",
    message:
      "Let's get your portfolio set up. This is where you'll manage all your portfolio companies.",
  },
  {
    id: "import-csv",
    page: "/portfolio",
    target: '[data-onboarding="import-csv"]',
    title: "Import CSV",
    message:
      "You can bulk import companies from a CSV file with founder contact info.",
    action: "click",
  },
  {
    id: "add-contact",
    page: "/portfolio",
    target: '[data-onboarding="add-contact"]',
    title: "Add Contact",
    message:
      "Or add founders one at a time. Click here to add your first contact.",
    action: "click",
  },

  // Page 2: Requests
  {
    id: "requests-intro",
    page: "/requests",
    target: '[data-onboarding="requests-title"]',
    title: "Metric Requests",
    message:
      "This is where you'll send metric requests to founders and track their submissions.",
  },
  {
    id: "create-request",
    page: "/requests",
    target: '[data-onboarding="new-request"]',
    title: "Send Your First Request",
    message:
      "Click here to create a metric request. You can choose from industry templates or define custom metrics.",
    action: "click",
  },
];

export const TOTAL_STEPS = ONBOARDING_STEPS.length;

export function getStepById(id: string): OnboardingStep | undefined {
  return ONBOARDING_STEPS.find((step) => step.id === id);
}

export function getStepIndex(id: string): number {
  return ONBOARDING_STEPS.findIndex((step) => step.id === id);
}

export function getStepByIndex(index: number): OnboardingStep | undefined {
  return ONBOARDING_STEPS[index];
}

export function getStepsForPage(page: string): OnboardingStep[] {
  return ONBOARDING_STEPS.filter((step) => step.page === page);
}
